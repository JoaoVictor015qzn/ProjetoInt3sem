from uuid import UUID

from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import List

from schemas.users import UserCreate, UserUpdate, UserResponse
from core.security import hash_password, get_current_user
from core.permissions import require_role
from core.database import get_db
from models.models import Colaborador

router = APIRouter()


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