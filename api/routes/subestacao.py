from uuid import UUID

from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import List

from schemas.subestacao import SubestacaoCreate, SubestacaoUpdate, SubestacaoResponse
from core.security import get_current_user
from core.permissions import require_role
from core.database import get_db
from models.models import Subestacao

router = APIRouter()


# ── CREATE ───────────────────────────────────────────────────────────

@router.post("/", response_model=SubestacaoResponse, status_code=status.HTTP_201_CREATED)
def create_subestacao(
    payload: SubestacaoCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "gestor")),
):
    sub = Subestacao(
        nome=payload.nome,
        localizacao=payload.localizacao,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


# ── READ (list) ──────────────────────────────────────────────────────

@router.get("/", response_model=List[SubestacaoResponse])
def list_subestacoes(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return db.query(Subestacao).filter(Subestacao.ativa == True).all()


# ── READ (single) ───────────────────────────────────────────────────

@router.get("/{sub_id}", response_model=SubestacaoResponse)
def get_subestacao(
    sub_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    sub = db.query(Subestacao).filter(
        Subestacao.id == sub_id, Subestacao.ativa == True
    ).first()
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subestação não encontrada",
        )
    return sub


# ── UPDATE ───────────────────────────────────────────────────────────

@router.put("/{sub_id}", response_model=SubestacaoResponse)
def update_subestacao(
    sub_id: UUID,
    payload: SubestacaoUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "gestor")),
):
    sub = db.query(Subestacao).filter(
        Subestacao.id == sub_id, Subestacao.ativa == True
    ).first()
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subestação não encontrada",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(sub, key, value)

    db.commit()
    db.refresh(sub)
    return sub


# ── DELETE (soft-delete) ─────────────────────────────────────────────

@router.delete("/{sub_id}", status_code=status.HTTP_200_OK)
def delete_subestacao(
    sub_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    sub = db.query(Subestacao).filter(
        Subestacao.id == sub_id, Subestacao.ativa == True
    ).first()
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subestação não encontrada",
        )

    sub.ativa = False
    db.commit()
    return {"msg": "Subestação desativada com sucesso"}
