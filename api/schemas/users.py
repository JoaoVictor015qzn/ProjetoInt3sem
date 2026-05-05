from enum import Enum
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class UserRole(str, Enum):
    operador = "operador"
    supervisor = "supervisor"
    gestor = "gestor"
    admin = "admin"


# ── Base ──────────────────────────────────────────────────────────────

class UserBase(BaseModel):
    nome: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    cpf: str = Field(..., min_length=11, max_length=14)
    cargo: str = Field(..., min_length=2, max_length=80)
    rfid_uid: Optional[str] = Field(None, max_length=20)
    role: UserRole = Field(default=UserRole.operador)


# ── Create ────────────────────────────────────────────────────────────

class UserCreate(UserBase):
    senha: str = Field(..., min_length=6)


# ── Update (parcial) ─────────────────────────────────────────────────

class UserUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=2, max_length=120)
    email: Optional[EmailStr] = None
    cpf: Optional[str] = Field(None, min_length=11, max_length=14)
    cargo: Optional[str] = Field(None, min_length=2, max_length=80)
    rfid_uid: Optional[str] = Field(None, max_length=20)
    role: Optional[UserRole] = None
    senha: Optional[str] = Field(None, min_length=6)


# ── Response ──────────────────────────────────────────────────────────

class UserResponse(BaseModel):
    id: UUID
    nome: str
    email: EmailStr
    cpf: str
    cargo: str
    rfid_uid: Optional[str] = None
    role: UserRole
    foto_url: Optional[str] = None
    ativo: bool
    criado_em: datetime

    model_config = {"from_attributes": True}


# ── Auth ──────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    senha: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
