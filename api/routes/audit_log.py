from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from schemas.audit_log import AuditLogResponse
from core.permissions import require_role
from core.database import get_db
from models.models import AuditLog, Colaborador

router = APIRouter()


@router.get("/", response_model=List[AuditLogResponse])
def list_audit_logs(
    entidade: Optional[str] = Query(None, description="Filtrar por entidade (colaborador, subestacao, permissao)"),
    acao: Optional[str] = Query(None, description="Filtrar por ação (CRIAR_COLABORADOR, EDITAR_SUBESTACAO, etc.)"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "gestor")),
):
    """Lista os logs de auditoria administrativa. Apenas admin e gestor."""
    query = db.query(AuditLog)

    if entidade:
        query = query.filter(AuditLog.entidade == entidade)
    if acao:
        query = query.filter(AuditLog.acao == acao)

    logs = query.order_by(AuditLog.data_hora.desc()).limit(limit).all()

    # Enriquecer com nome do usuário
    result = []
    for log in logs:
        usuario = db.query(Colaborador).filter(Colaborador.id == log.usuario_id).first()
        item = AuditLogResponse(
            id=log.id,
            usuario_id=log.usuario_id,
            usuario_nome=usuario.nome if usuario else "Desconhecido",
            acao=log.acao,
            entidade=log.entidade,
            entidade_id=log.entidade_id,
            detalhes=log.detalhes,
            data_hora=log.data_hora,
        )
        result.append(item)

    return result
