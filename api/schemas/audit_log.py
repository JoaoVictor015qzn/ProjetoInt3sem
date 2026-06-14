from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional


class AuditLogResponse(BaseModel):
    id: UUID
    usuario_id: UUID
    usuario_nome: Optional[str] = None
    acao: str
    entidade: str
    entidade_id: Optional[UUID] = None
    detalhes: Optional[str] = None
    data_hora: datetime

    class Config:
        from_attributes = True
