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
from core.validators import is_valid_cpf
from core.audit import registrar_auditoria
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
    if not is_valid_cpf(user.cpf):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CPF inválido matematicamente",
        )

    if db.query(Colaborador).filter(Colaborador.email == user.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já cadastrado",
        )
    if db.query(Colaborador).filter(Colaborador.cpf == user.cpf).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CPF já cadastrado",
        )
    if user.rfid_uid and db.query(Colaborador).filter(Colaborador.rfid_uid == user.rfid_uid).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="RFID UID já cadastrado",
        )

    new_user = Colaborador(
        nome=user.nome,
        email=user.email,
        cpf=user.cpf,
        cargo=user.cargo,
        rfid_uid=user.rfid_uid,
        role=user.role.value,
        gestor_id=user.gestor_id,
        hashed_password=hash_password(user.senha),
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    registrar_auditoria(
        db, current_user["id"], "CRIAR_COLABORADOR", "colaborador",
        new_user.id, f"Criou o colaborador {new_user.nome} ({new_user.role})"
    )

    return new_user


# ── READ (list) ──────────────────────────────────────────────────────

@router.get("/", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "gestor", "supervisor", "operador")),
):
    query = db.query(Colaborador).filter(Colaborador.ativo == True)
    
    # Filtro de Visibilidade Hierárquica
    if current_user["role"] == "admin":
        pass  # Vê todos
    elif current_user["role"] == "gestor":
        # Vê a si mesmo, seus supervisores e os operadores dos seus supervisores
        my_id = current_user["id"]
        supervisores = db.query(Colaborador.id).filter(Colaborador.gestor_id == my_id).all()
        sup_ids = [s.id for s in supervisores]
        query = query.filter(
            (Colaborador.id == my_id) | 
            (Colaborador.gestor_id == my_id) | 
            (Colaborador.gestor_id.in_(sup_ids))
        )
    elif current_user["role"] == "supervisor":
        # Vê a si mesmo e seus operadores
        my_id = current_user["id"]
        query = query.filter((Colaborador.id == my_id) | (Colaborador.gestor_id == my_id))
    elif current_user["role"] == "operador":
        # Vê a si mesmo e seu gestor
        my_id = current_user["id"]
        me = db.query(Colaborador).filter(Colaborador.id == my_id).first()
        if me and me.gestor_id:
            query = query.filter((Colaborador.id == my_id) | (Colaborador.id == me.gestor_id))
        else:
            query = query.filter(Colaborador.id == my_id)

    return query.all()


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
        
    # Validar CPF
    if "cpf" in update_data and update_data["cpf"] is not None:
        if not is_valid_cpf(update_data["cpf"]):
            raise HTTPException(status_code=400, detail="CPF inválido matematicamente")

    # Verificar duplicatas
    if "email" in update_data and update_data["email"] != user.email:
        if db.query(Colaborador).filter(Colaborador.email == update_data["email"]).first():
            raise HTTPException(status_code=400, detail="Email já em uso")
    
    if "cpf" in update_data and update_data["cpf"] != user.cpf:
        if db.query(Colaborador).filter(Colaborador.cpf == update_data["cpf"]).first():
            raise HTTPException(status_code=400, detail="CPF já em uso")
            
    if "rfid_uid" in update_data and update_data["rfid_uid"] != user.rfid_uid and update_data["rfid_uid"] is not None:
        if db.query(Colaborador).filter(Colaborador.rfid_uid == update_data["rfid_uid"]).first():
            raise HTTPException(status_code=400, detail="RFID UID já em uso")

    for key, value in update_data.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)

    registrar_auditoria(
        db, current_user["id"], "EDITAR_COLABORADOR", "colaborador",
        user.id, f"Editou o colaborador {user.nome}"
    )

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

    registrar_auditoria(
        db, current_user["id"], "UPLOAD_FOTO", "colaborador",
        user.id, f"Enviou foto para o colaborador {user.nome}"
    )

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

    registrar_auditoria(
        db, current_user["id"], "DESATIVAR_COLABORADOR", "colaborador",
        user.id, f"Desativou o colaborador {user.nome}"
    )

    return {"msg": "Usuário desativado com sucesso"}