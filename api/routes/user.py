from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends, status
from typing import List

from schemas.users import UserCreate, UserUpdate, UserResponse, UserRole
from core.security import hash_password, get_current_user
from core.permissions import require_role

router = APIRouter()

# ── Banco in-memory ──────────────────────────────────────────────────

fake_users_db: list[dict] = []
user_id_counter = 1


# ── Helpers ──────────────────────────────────────────────────────────

def _find_user(user_id: int) -> dict | None:
    return next((u for u in fake_users_db if u["id"] == user_id), None)


def _find_user_by_email(email: str) -> dict | None:
    return next((u for u in fake_users_db if u["email"] == email), None)


# ── CREATE ───────────────────────────────────────────────────────────

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user: UserCreate,
    current_user: dict = Depends(require_role("admin", "gestor")),
):
    global user_id_counter

    if _find_user_by_email(user.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já cadastrado",
        )

    new_user = {
        "id": user_id_counter,
        "nome": user.nome,
        "email": user.email,
        "cpf": user.cpf,
        "cargo": user.cargo,
        "rfid_uid": user.rfid_uid,
        "role": user.role.value,
        "hashed_password": hash_password(user.senha),
        "ativo": True,
        "criado_em": datetime.utcnow(),
    }

    fake_users_db.append(new_user)
    user_id_counter += 1
    return new_user


# ── READ (list) ──────────────────────────────────────────────────────

@router.get("/", response_model=List[UserResponse])
def list_users(
    current_user: dict = Depends(require_role("admin", "gestor", "supervisor")),
):
    return [u for u in fake_users_db if u["ativo"]]


# ── READ (single) ───────────────────────────────────────────────────

@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    current_user: dict = Depends(get_current_user),
):
    user = _find_user(user_id)
    if not user or not user["ativo"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado",
        )
    return user


# ── UPDATE ───────────────────────────────────────────────────────────

@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UserUpdate,
    current_user: dict = Depends(require_role("admin", "gestor")),
):
    user = _find_user(user_id)
    if not user or not user["ativo"]:
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
    if "email" in update_data and update_data["email"] != user["email"]:
        if _find_user_by_email(update_data["email"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email já cadastrado",
            )

    user.update(update_data)
    return user


# ── DELETE (soft-delete) ─────────────────────────────────────────────

@router.delete("/{user_id}", status_code=status.HTTP_200_OK)
def delete_user(
    user_id: int,
    current_user: dict = Depends(require_role("admin")),
):
    user = _find_user(user_id)
    if not user or not user["ativo"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado",
        )

    user["ativo"] = False
    return {"msg": "Usuário desativado com sucesso"}