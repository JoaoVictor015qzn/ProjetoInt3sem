from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from schemas.log_acesso import (
    LogAcessoResponse,
    ValidarAcessoRequest,
    ValidarAcessoResponse,
)
from core.security import get_current_user
from core.permissions import require_role
from core.database import get_db
from models.models import LogAcesso, Colaborador, Permissao, Subestacao

router = APIRouter()


# ── Validar Acesso (coração do sistema) ──────────────────────────────

@router.post("/acesso/validar", response_model=ValidarAcessoResponse)
def validar_acesso(
    payload: ValidarAcessoRequest,
    db: Session = Depends(get_db),
):
    """
    Recebe um UID RFID + subestação e decide se LIBERA ou BLOQUEIA.
    Registra o log de acesso no banco.
    """
    # 1. Buscar colaborador pelo RFID
    colaborador = db.query(Colaborador).filter(
        Colaborador.rfid_uid == payload.rfid_uid,
        Colaborador.ativo == True,
    ).first()

    if not colaborador:
        # RFID não cadastrado → BLOQUEAR
        log = LogAcesso(
            subestacao_id=payload.subestacao_id,
            rfid_uid=payload.rfid_uid,
            tipo=payload.tipo,
            resultado="NEGADO",
        )
        db.add(log)
        db.commit()
        return ValidarAcessoResponse(
            acao="BLOQUEAR",
            motivo="RFID não cadastrado no sistema",
        )

    # 2. Verificar permissão ativa para a subestação
    agora = datetime.utcnow()
    permissao = db.query(Permissao).filter(
        Permissao.colaborador_id == colaborador.id,
        Permissao.subestacao_id == payload.subestacao_id,
        Permissao.ativa == True,
    ).first()

    tem_permissao = False
    if permissao:
        # Checar validade temporal (se definida)
        inicio_ok = permissao.validade_inicio is None or permissao.validade_inicio <= agora
        fim_ok = permissao.validade_fim is None or permissao.validade_fim >= agora
        tem_permissao = inicio_ok and fim_ok

    # 3. Registrar log
    log = LogAcesso(
        colaborador_id=colaborador.id,
        subestacao_id=payload.subestacao_id,
        rfid_uid=payload.rfid_uid,
        tipo=payload.tipo,
        resultado="PERMITIDO" if tem_permissao else "NEGADO",
    )
    db.add(log)
    db.commit()

    if tem_permissao:
        return ValidarAcessoResponse(
            acao="LIBERAR",
            colaborador=colaborador.nome,
        )
    else:
        return ValidarAcessoResponse(
            acao="BLOQUEAR",
            colaborador=colaborador.nome,
            motivo="Sem permissão para esta subestação",
        )


# ── Listar Logs ──────────────────────────────────────────────────────

@router.get("/logs", response_model=List[LogAcessoResponse])
def list_logs(
    subestacao_id: Optional[UUID] = Query(None),
    colaborador_id: Optional[UUID] = Query(None),
    resultado: Optional[str] = Query(None, pattern="^(PERMITIDO|NEGADO)$"),
    data_inicio: Optional[datetime] = Query(None),
    data_fim: Optional[datetime] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "gestor", "supervisor")),
):
    query = db.query(LogAcesso)

    if subestacao_id:
        query = query.filter(LogAcesso.subestacao_id == subestacao_id)
    if colaborador_id:
        query = query.filter(LogAcesso.colaborador_id == colaborador_id)
    if resultado:
        query = query.filter(LogAcesso.resultado == resultado)
    if data_inicio:
        query = query.filter(LogAcesso.data_hora >= data_inicio)
    if data_fim:
        query = query.filter(LogAcesso.data_hora <= data_fim)

    return query.order_by(LogAcesso.data_hora.desc()).limit(limit).all()
