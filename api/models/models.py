import uuid
from datetime import datetime

from sqlalchemy import (
    Column,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    Enum as SAEnum,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from core.database import Base


# ── Colaborador ──────────────────────────────────────────────────────

class Colaborador(Base):
    __tablename__ = "colaborador"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    cpf = Column(String(14), unique=True, nullable=False)
    cargo = Column(String(80), nullable=False)
    rfid_uid = Column(String(20), unique=True, nullable=True)
    role = Column(
        SAEnum("operador", "supervisor", "gestor", "admin", name="user_role"),
        nullable=False,
        default="operador",
    )
    hashed_password = Column(String(255), nullable=False)
    foto_url = Column(String(500), nullable=True)
    ativo = Column(Boolean, default=True, nullable=False)
    criado_em = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relacionamentos
    permissoes = relationship("Permissao", back_populates="colaborador")
    logs = relationship("LogAcesso", back_populates="colaborador")


# ── Subestação ───────────────────────────────────────────────────────

class Subestacao(Base):
    __tablename__ = "subestacao"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome = Column(String(120), nullable=False)
    localizacao = Column(String(255), nullable=True)
    ativa = Column(Boolean, default=True, nullable=False)

    # Relacionamentos
    permissoes = relationship("Permissao", back_populates="subestacao")
    logs = relationship("LogAcesso", back_populates="subestacao")


# ── Permissão ────────────────────────────────────────────────────────

class Permissao(Base):
    __tablename__ = "permissao"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    colaborador_id = Column(
        UUID(as_uuid=True),
        ForeignKey("colaborador.id"),
        nullable=False,
    )
    subestacao_id = Column(
        UUID(as_uuid=True),
        ForeignKey("subestacao.id"),
        nullable=False,
    )
    validade_inicio = Column(DateTime, nullable=True)
    validade_fim = Column(DateTime, nullable=True)
    ativa = Column(Boolean, default=True, nullable=False)

    # Relacionamentos
    colaborador = relationship("Colaborador", back_populates="permissoes")
    subestacao = relationship("Subestacao", back_populates="permissoes")


# ── Log de Acesso ────────────────────────────────────────────────────

class LogAcesso(Base):
    __tablename__ = "log_acesso"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    colaborador_id = Column(
        UUID(as_uuid=True),
        ForeignKey("colaborador.id"),
        nullable=True,
    )
    subestacao_id = Column(
        UUID(as_uuid=True),
        ForeignKey("subestacao.id"),
        nullable=False,
    )
    rfid_uid = Column(String(20), nullable=False)
    tipo = Column(
        SAEnum("ENTRADA", "SAIDA", name="tipo_acesso"),
        nullable=False,
        default="ENTRADA",
    )
    resultado = Column(
        SAEnum("PERMITIDO", "NEGADO", name="resultado_acesso"),
        nullable=False,
    )
    data_hora = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relacionamentos
    colaborador = relationship("Colaborador", back_populates="logs")
    subestacao = relationship("Subestacao", back_populates="logs")
