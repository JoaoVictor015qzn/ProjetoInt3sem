from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, HTTPException, status, Request
from sqlalchemy.orm import Session
import csv
import io
from openpyxl import Workbook
from fpdf import FPDF

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
async def validar_acesso(
    payload: ValidarAcessoRequest,
    request: Request,
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
    db.refresh(log)

    # 4. Disparar notificação WebSocket para Supervisor e Gestor
    if colaborador.gestor_id:
        msg = {
            "tipo": log.tipo,
            "resultado": log.resultado,
            "colaborador": colaborador.nome,
            "subestacao_id": str(payload.subestacao_id),
            "data_hora": log.data_hora.isoformat()
        }
        # Notifica o chefe direto (Supervisor)
        await request.app.state.ws_manager.send_notification(str(colaborador.gestor_id), msg)
        
        # Notifica o chefe do chefe (Gestor)
        sup = db.query(Colaborador).filter(Colaborador.id == colaborador.gestor_id).first()
        if sup and sup.gestor_id:
            await request.app.state.ws_manager.send_notification(str(sup.gestor_id), msg)

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
    current_user: dict = Depends(require_role("admin", "gestor", "supervisor", "operador")),
):
    query = db.query(LogAcesso).outerjoin(Colaborador, LogAcesso.colaborador_id == Colaborador.id)

    # Filtros de Hierarquia
    user_role = current_user.get("role", "operador")
    user_id = current_user.get("id")

    if user_role == "operador":
        query = query.filter(LogAcesso.colaborador_id == user_id)
    elif user_role == "supervisor":
        query = query.filter(
            (LogAcesso.colaborador_id == user_id) |
            (Colaborador.role == "operador")
        )
    elif user_role == "gestor":
        query = query.filter(
            (LogAcesso.colaborador_id == user_id) |
            (Colaborador.role.in_(["operador", "supervisor"]))
        )
    # admin visualiza tudo

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


# ── Exportar CSV ─────────────────────────────────────────────────────

@router.get("/logs/export/csv")
def export_logs_csv(
    token: str = Query(..., description="JWT token for authentication"),
    subestacao_id: Optional[UUID] = Query(None),
    colaborador_id: Optional[UUID] = Query(None),
    resultado: Optional[str] = Query(None, pattern="^(PERMITIDO|NEGADO)$"),
    data_inicio: Optional[datetime] = Query(None),
    data_fim: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
):
    current_user = get_current_user(token)
    user_role = current_user.get("role", "operador")
    
    if user_role not in ["admin", "gestor", "supervisor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissão insuficiente",
        )

    query = db.query(LogAcesso, Colaborador, Subestacao).outerjoin(
        Colaborador, LogAcesso.colaborador_id == Colaborador.id
    ).outerjoin(
        Subestacao, LogAcesso.subestacao_id == Subestacao.id
    )

    # Filtros de Hierarquia
    user_role = current_user.get("role", "operador")
    user_id = current_user.get("id")

    if user_role == "supervisor":
        query = query.filter(
            (LogAcesso.colaborador_id == user_id) |
            (Colaborador.role == "operador")
        )
    elif user_role == "gestor":
        query = query.filter(
            (LogAcesso.colaborador_id == user_id) |
            (Colaborador.role.in_(["operador", "supervisor"]))
        )

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

    logs = query.order_by(LogAcesso.data_hora.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    writer.writerow(["Data/Hora", "Resultado", "Colaborador", "Cargo", "Subestacao", "Tipo", "RFID UID"])

    for log, colab, sub in logs:
        data_str = log.data_hora.strftime("%d/%m/%Y %H:%M:%S")
        colab_nome = colab.nome if colab else "Desconhecido"
        colab_cargo = colab.cargo if colab else "-"
        sub_nome = sub.nome if sub else "Desconhecida"
        writer.writerow([data_str, log.resultado, colab_nome, colab_cargo, sub_nome, log.tipo, log.rfid_uid])

    response = Response(content=output.getvalue(), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=historico_acessos.csv"
    return response


# ── Exportar Excel ───────────────────────────────────────────────────

@router.get("/logs/export/excel")
def export_logs_excel(
    token: str = Query(..., description="JWT token for authentication"),
    subestacao_id: Optional[UUID] = Query(None),
    colaborador_id: Optional[UUID] = Query(None),
    resultado: Optional[str] = Query(None, pattern="^(PERMITIDO|NEGADO)$"),
    data_inicio: Optional[datetime] = Query(None),
    data_fim: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
):
    current_user = get_current_user(token)
    user_role = current_user.get("role", "operador")
    
    if user_role not in ["admin", "gestor", "supervisor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissão insuficiente",
        )

    query = db.query(LogAcesso, Colaborador, Subestacao).outerjoin(
        Colaborador, LogAcesso.colaborador_id == Colaborador.id
    ).outerjoin(
        Subestacao, LogAcesso.subestacao_id == Subestacao.id
    )

    if user_role == "supervisor":
        query = query.filter((LogAcesso.colaborador_id == current_user.get("id")) | (Colaborador.role == "operador"))
    elif user_role == "gestor":
        query = query.filter((LogAcesso.colaborador_id == current_user.get("id")) | (Colaborador.role.in_(["operador", "supervisor"])))

    if subestacao_id: query = query.filter(LogAcesso.subestacao_id == subestacao_id)
    if colaborador_id: query = query.filter(LogAcesso.colaborador_id == colaborador_id)
    if resultado: query = query.filter(LogAcesso.resultado == resultado)
    if data_inicio: query = query.filter(LogAcesso.data_hora >= data_inicio)
    if data_fim: query = query.filter(LogAcesso.data_hora <= data_fim)

    logs = query.order_by(LogAcesso.data_hora.desc()).all()

    wb = Workbook()
    ws = wb.active
    ws.title = "Histórico de Acessos"
    ws.append(["Data/Hora", "Resultado", "Colaborador", "Cargo", "Subestação", "Tipo", "RFID UID"])

    for log, colab, sub in logs:
        data_str = log.data_hora.strftime("%d/%m/%Y %H:%M:%S")
        colab_nome = colab.nome if colab else "Desconhecido"
        colab_cargo = colab.cargo if colab else "-"
        sub_nome = sub.nome if sub else "Desconhecida"
        ws.append([data_str, log.resultado, colab_nome, colab_cargo, sub_nome, log.tipo, log.rfid_uid])

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    
    response = Response(content=output.getvalue(), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    response.headers["Content-Disposition"] = "attachment; filename=historico_acessos.xlsx"
    return response


# ── Exportar PDF ─────────────────────────────────────────────────────

@router.get("/logs/export/pdf")
def export_logs_pdf(
    token: str = Query(..., description="JWT token for authentication"),
    subestacao_id: Optional[UUID] = Query(None),
    colaborador_id: Optional[UUID] = Query(None),
    resultado: Optional[str] = Query(None, pattern="^(PERMITIDO|NEGADO)$"),
    data_inicio: Optional[datetime] = Query(None),
    data_fim: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
):
    current_user = get_current_user(token)
    user_role = current_user.get("role", "operador")
    
    if user_role not in ["admin", "gestor", "supervisor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissão insuficiente",
        )

    query = db.query(LogAcesso, Colaborador, Subestacao).outerjoin(
        Colaborador, LogAcesso.colaborador_id == Colaborador.id
    ).outerjoin(
        Subestacao, LogAcesso.subestacao_id == Subestacao.id
    )

    if user_role == "supervisor":
        query = query.filter((LogAcesso.colaborador_id == current_user.get("id")) | (Colaborador.role == "operador"))
    elif user_role == "gestor":
        query = query.filter((LogAcesso.colaborador_id == current_user.get("id")) | (Colaborador.role.in_(["operador", "supervisor"])))

    if subestacao_id: query = query.filter(LogAcesso.subestacao_id == subestacao_id)
    if colaborador_id: query = query.filter(LogAcesso.colaborador_id == colaborador_id)
    if resultado: query = query.filter(LogAcesso.resultado == resultado)
    if data_inicio: query = query.filter(LogAcesso.data_hora >= data_inicio)
    if data_fim: query = query.filter(LogAcesso.data_hora <= data_fim)

    logs = query.order_by(LogAcesso.data_hora.desc()).all()

    pdf = FPDF(orientation="L", unit="mm", format="A4")
    pdf.add_page()
    
    # Try to load a unicode font if available, else fallback to standard
    pdf.set_font("Helvetica", style="B", size=14)
    pdf.cell(0, 10, "Historico de Acessos", align="C", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("Helvetica", style="B", size=10)
    # Tabela cabeçalho
    pdf.cell(40, 8, "Data/Hora", border=1)
    pdf.cell(25, 8, "Resultado", border=1)
    pdf.cell(60, 8, "Colaborador", border=1)
    pdf.cell(30, 8, "Cargo", border=1)
    pdf.cell(50, 8, "Subestacao", border=1)
    pdf.cell(35, 8, "RFID UID", border=1, new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", size=9)
    for log, colab, sub in logs:
        data_str = log.data_hora.strftime("%d/%m/%Y %H:%M")
        colab_nome = (colab.nome[:25] + "..") if colab and len(colab.nome) > 25 else (colab.nome if colab else "-")
        colab_cargo = colab.cargo if colab else "-"
        sub_nome = (sub.nome[:22] + "..") if sub and len(sub.nome) > 22 else (sub.nome if sub else "-")
        
        pdf.cell(40, 8, data_str, border=1)
        pdf.cell(25, 8, log.resultado, border=1)
        pdf.cell(60, 8, colab_nome, border=1)
        pdf.cell(30, 8, colab_cargo, border=1)
        pdf.cell(50, 8, sub_nome, border=1)
        pdf.cell(35, 8, log.rfid_uid or "-", border=1, new_x="LMARGIN", new_y="NEXT")

    # Output do PDF em memória
    output = bytes(pdf.output())
    
    response = Response(content=output, media_type="application/pdf")
    response.headers["Content-Disposition"] = "attachment; filename=historico_acessos.pdf"
    return response

