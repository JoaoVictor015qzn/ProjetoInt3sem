from uuid import UUID
from sqlalchemy.orm import Session
from models.models import AuditLog


def registrar_auditoria(
    db: Session,
    usuario_id: UUID,
    acao: str,
    entidade: str,
    entidade_id: UUID | None = None,
    detalhes: str | None = None,
):
    """Registra uma ação administrativa no log de auditoria."""
    log = AuditLog(
        usuario_id=usuario_id,
        acao=acao,
        entidade=entidade,
        entidade_id=entidade_id,
        detalhes=detalhes,
    )
    db.add(log)
    db.commit()
