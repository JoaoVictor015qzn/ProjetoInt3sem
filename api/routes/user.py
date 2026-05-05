import os
import uuid as uuid_mod
from uuid import UUID

from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List

from schemas.users import UserCreate, UserUpdate, UserResponse
from core.security import hash_password, get_current_user
from core.permissions import require_role
from core.database import get_db
from models.models import Colaborador

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ── CREATE ───────────────────────────────────────────────────────────

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "gestor")),
):
    if db.query(Colaborador).filter(Colaborador.email == user.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já cadastrado",
        )

    new_user = Colaborador(
        nome=user.nome,
        email=user.email,
        cpf=user.cpf,
        cargo=user.cargo,
        rfid_uid=user.rfid_uid,
        role=user.role.value,
        hashed_password=hash_password(user.senha),
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


# ── READ (list) ──────────────────────────────────────────────────────

@router.get("/", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "gestor", "supervisor")),
):
    return db.query(Colaborador).filter(Colaborador.ativo == True).all()


# ── READ (single) ───────────────────────────────────────────────────

@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user = db.query(Colaborador).filter(
        Colaborador.id == user_id, Colaborador.ativo == True
    ).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado",
        )
    return user


# ── UPDATE ───────────────────────────────────────────────────────────

@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: UUID,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "gestor")),
):
    user = db.query(Colaborador).filter(
        Colaborador.id == user_id, Colaborador.ativo == True
    ).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado",
        )

    update_data = payload.model_dump(exclude_unset=True)

    # Hash da senha se foi informada
    if "senha" in update_data:
        update_data["hashed_password"] = hash_password(update_data.pop("senha"))

    # Converter enum para string
    if "role" in update_data and update_data["role"] is not None:
        update_data["role"] = update_data["role"].value

    # Verificar email duplicado
    if "email" in update_data and update_data["email"] != user.email:
        if db.query(Colaborador).filter(Colaborador.email == update_data["email"]).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email já cadastrado",
            )

    for key, value in update_data.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return user


# ── UPLOAD FOTO ──────────────────────────────────────────────────────

@router.post("/{user_id}/foto", response_model=UserResponse)
async def upload_foto(
    user_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "gestor")),
):
    """Faz upload da foto do colaborador. Apenas admin/gestor pode."""
    user = db.query(Colaborador).filter(
        Colaborador.id == user_id, Colaborador.ativo == True
    ).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado",
        )

    # Validar tipo do arquivo
    allowed = {"image/jpeg", "image/png", "image/webp"}
    if file.content_type not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo de arquivo não suportado: {file.content_type}. Use JPEG, PNG ou WebP.",
        )

    # Gerar nome único
    ext = file.filename.split(".")[-1] if file.filename else "jpg"
    filename = f"{user_id}_{uuid_mod.uuid4().hex[:8]}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    # Salvar arquivo
    contents = await file.read()
    with open(filepath, "wb") as f:
        f.write(contents)

    # Apagar foto antiga se existir
    if user.foto_url:
        old_path = os.path.join(UPLOAD_DIR, os.path.basename(user.foto_url))
        if os.path.exists(old_path):
            os.remove(old_path)

    # Atualizar banco
    user.foto_url = f"/uploads/{filename}"
    db.commit()
    db.refresh(user)
    return user


# ── DELETE FOTO ──────────────────────────────────────────────────────

@router.delete("/{user_id}/foto", response_model=UserResponse)
def delete_foto(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "gestor")),
):
    """Remove a foto do colaborador."""
    user = db.query(Colaborador).filter(
        Colaborador.id == user_id, Colaborador.ativo == True
    ).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado",
        )

    if user.foto_url:
        old_path = os.path.join(UPLOAD_DIR, os.path.basename(user.foto_url))
        if os.path.exists(old_path):
            os.remove(old_path)
        user.foto_url = None
        db.commit()
        db.refresh(user)

    return user


# ── DELETE (soft-delete) ─────────────────────────────────────────────

@router.delete("/{user_id}", status_code=status.HTTP_200_OK)
def delete_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    user = db.query(Colaborador).filter(
        Colaborador.id == user_id, Colaborador.ativo == True
    ).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado",
        )

    user.ativo = False
    db.commit()
    return {"msg": "Usuário desativado com sucesso"}