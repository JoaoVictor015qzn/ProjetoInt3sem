from uuid import UUID

from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import List

from schemas.permissao import PermissaoCreate, PermissaoResponse
from core.permissions import require_role
from core.database import get_db
from models.models import Permissao, Colaborador, Subestacao

router = APIRouter()


# ── CREATE ───────────────────────────────────────────────────────────

@router.post("/", response_model=PermissaoResponse, status_code=status.HTTP_201_CREATED)
def create_permissao(
    payload: PermissaoCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "gestor")),
):
    # Verificar se colaborador existe
    colab = db.query(Colaborador).filter(
        Colaborador.id == payload.colaborador_id, Colaborador.ativo == True
    ).first()
    if not colab:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Colaborador não encontrado",
        )

    # Verificar se subestação existe
    sub = db.query(Subestacao).filter(
        Subestacao.id == payload.subestacao_id, Subestacao.ativa == True
    ).first()
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subestação não encontrada",
        )

    perm = Permissao(
        colaborador_id=payload.colaborador_id,
        subestacao_id=payload.subestacao_id,
        validade_inicio=payload.validade_inicio,
        validade_fim=payload.validade_fim,
    )
    db.add(perm)
    db.commit()
    db.refresh(perm)
    return perm


# ── READ (list) ──────────────────────────────────────────────────────

@router.get("/", response_model=List[PermissaoResponse])
def list_permissoes(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "gestor", "supervisor")),
):
    return db.query(Permissao).filter(Permissao.ativa == True).all()


# ── DELETE (revoga permissão) ────────────────────────────────────────

@router.delete("/{perm_id}", status_code=status.HTTP_200_OK)
def revoke_permissao(
    perm_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "gestor")),
):
    perm = db.query(Permissao).filter(
        Permissao.id == perm_id, Permissao.ativa == True
    ).first()
    if not perm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Permissão não encontrada",
        )

    perm.ativa = False
    db.commit()
    return {"msg": "Permissão revogada com sucesso"}
