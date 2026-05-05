from typing import Optional
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ValidarAcessoRequest(BaseModel):
    rfid_uid: str = Field(..., max_length=20)
    subestacao_id: UUID
    tipo: str = Field(default="ENTRADA", pattern="^(ENTRADA|SAIDA)$")


class ValidarAcessoResponse(BaseModel):
    acao: str  # "LIBERAR" ou "BLOQUEAR"
    colaborador: Optional[str] = None
    motivo: Optional[str] = None


class LogAcessoResponse(BaseModel):
    id: UUID
    colaborador_id: Optional[UUID] = None
    subestacao_id: UUID
    rfid_uid: str
    tipo: str
    resultado: str
    data_hora: datetime

    model_config = {"from_attributes": True}
