from typing import Optional
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class PermissaoCreate(BaseModel):
    colaborador_id: UUID
    subestacao_id: UUID
    validade_inicio: Optional[datetime] = None
    validade_fim: Optional[datetime] = None


class PermissaoResponse(BaseModel):
    id: UUID
    colaborador_id: UUID
    subestacao_id: UUID
    validade_inicio: Optional[datetime] = None
    validade_fim: Optional[datetime] = None
    ativa: bool

    model_config = {"from_attributes": True}
