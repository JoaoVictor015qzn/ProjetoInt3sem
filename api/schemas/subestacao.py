from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class SubestacaoCreate(BaseModel):
    nome: str = Field(..., min_length=2, max_length=120)
    localizacao: Optional[str] = Field(None, max_length=255)


class SubestacaoUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=2, max_length=120)
    localizacao: Optional[str] = Field(None, max_length=255)
    ativa: Optional[bool] = None


class SubestacaoResponse(BaseModel):
    id: UUID
    nome: str
    localizacao: Optional[str] = None
    ativa: bool

    model_config = {"from_attributes": True}
