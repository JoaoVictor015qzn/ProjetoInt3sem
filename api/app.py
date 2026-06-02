import os

from fastapi import FastAPI, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from core.database import engine, Base, get_db
from core.security import hash_password
from models.models import Colaborador, Subestacao, Permissao, LogAcesso
from routes import user, auth, subestacao, permissao, log_acesso

# ── Cria todas as tabelas no banco ───────────────────────────────────
Base.metadata.create_all(bind=engine)

# ── Cria diretório de uploads ────────────────────────────────────────
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(
    title="Sistema de Controle de Acesso — Subestação",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Servir arquivos de upload (fotos) ────────────────────────────────
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ── Routers ──────────────────────────────────────────────────────────
app.include_router(user.router, prefix="/users", tags=["Users"])
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(subestacao.router, prefix="/subestacoes", tags=["Subestações"])
app.include_router(permissao.router, prefix="/permissoes", tags=["Permissões"])
app.include_router(log_acesso.router, tags=["Acesso / Logs"])


# ── Seed Avançado ────────────────────────────────────────────────────

@app.post("/seed", tags=["Setup"], status_code=status.HTTP_201_CREATED)
def advanced_seed(db: Session = Depends(get_db)):
    """Cria dados fictícios para testes. Funciona apenas se o banco estiver vazio."""
    if db.query(Colaborador).first():
        return {"msg": "Seed já executado — banco não está vazio"}

    from datetime import datetime, timedelta
    import uuid

    # 1. Criar Colaboradores
    senhas = hash_password("senha123")
    admin = Colaborador(nome="Gestor Admin", email="admin@sistema.com", cpf="11111111111", cargo="Diretor", role="admin", hashed_password=hash_password("admin123"))
    db.add(admin)
    db.flush()
    
    gestor = Colaborador(nome="Carlos Silva", email="carlos@sistema.com", cpf="22222222222", cargo="Gerente de Operações", role="gestor", hashed_password=senhas, gestor_id=admin.id)
    db.add(gestor)
    db.flush()
    
    sup = Colaborador(nome="Ana Souza", email="ana@sistema.com", cpf="33333333333", cargo="Supervisora", role="supervisor", hashed_password=senhas, gestor_id=gestor.id)
    db.add(sup)
    db.flush()
    
    op1 = Colaborador(nome="João Pedro", email="joao@sistema.com", cpf="44444444444", cargo="Eletricista", role="operador", rfid_uid="TAG_JOAO_123", hashed_password=senhas, gestor_id=sup.id)
    op2 = Colaborador(nome="Maria Lima", email="maria@sistema.com", cpf="55555555555", cargo="Técnica", role="operador", rfid_uid="TAG_MARIA_456", hashed_password=senhas, gestor_id=sup.id)
    
    db.add_all([op1, op2])
    db.commit()

    # 2. Criar Subestações
    sub_norte = Subestacao(nome="Subestação Norte", localizacao="Zona Norte - Setor A", ativa=True)
    sub_sul = Subestacao(nome="Subestação Sul", localizacao="Zona Sul - Setor B", ativa=True)
    sub_leste = Subestacao(nome="Subestação Leste", localizacao="Zona Leste - Setor C", ativa=False)
    
    db.add_all([sub_norte, sub_sul, sub_leste])
    db.commit()

    # 3. Criar Permissões
    hoje = datetime.utcnow()
    p1 = Permissao(colaborador_id=op1.id, subestacao_id=sub_norte.id, validade_inicio=hoje - timedelta(days=1), validade_fim=hoje + timedelta(days=30), ativa=True)
    p2 = Permissao(colaborador_id=op1.id, subestacao_id=sub_sul.id, validade_inicio=hoje - timedelta(days=5), validade_fim=hoje + timedelta(days=15), ativa=True)
    p3 = Permissao(colaborador_id=op2.id, subestacao_id=sub_sul.id, validade_inicio=hoje - timedelta(days=10), validade_fim=hoje + timedelta(days=60), ativa=True)
    p4_exp = Permissao(colaborador_id=op2.id, subestacao_id=sub_norte.id, validade_inicio=hoje - timedelta(days=30), validade_fim=hoje - timedelta(days=1), ativa=True)
    p5_rev = Permissao(colaborador_id=sup.id, subestacao_id=sub_leste.id, validade_inicio=hoje - timedelta(days=2), validade_fim=hoje + timedelta(days=10), ativa=False)

    db.add_all([p1, p2, p3, p4_exp, p5_rev])
    db.commit()

    # 4. Criar Logs de Acesso
    l1 = LogAcesso(colaborador_id=op1.id, subestacao_id=sub_norte.id, rfid_uid="TAG_JOAO_123", tipo="ENTRADA", resultado="PERMITIDO", data_hora=hoje - timedelta(hours=5))
    l2 = LogAcesso(colaborador_id=op1.id, subestacao_id=sub_norte.id, rfid_uid="TAG_JOAO_123", tipo="SAIDA", resultado="PERMITIDO", data_hora=hoje - timedelta(hours=1))
    l3 = LogAcesso(colaborador_id=op2.id, subestacao_id=sub_norte.id, rfid_uid="TAG_MARIA_456", tipo="ENTRADA", resultado="NEGADO", data_hora=hoje - timedelta(hours=3))
    l4 = LogAcesso(colaborador_id=None, subestacao_id=sub_sul.id, rfid_uid="TAG_DESCONHECIDA", tipo="ENTRADA", resultado="NEGADO", data_hora=hoje - timedelta(minutes=30))
    l5 = LogAcesso(colaborador_id=op2.id, subestacao_id=sub_sul.id, rfid_uid="TAG_MARIA_456", tipo="ENTRADA", resultado="PERMITIDO", data_hora=hoje - timedelta(minutes=10))

    db.add_all([l1, l2, l3, l4, l5])
    db.commit()

    return {
        "msg": "Seed avançado concluído com sucesso",
        "cadastros": {
            "colaboradores": 5,
            "subestacoes": 3,
            "permissoes": 5,
            "logs": 5
        },
        "acesso_admin": {
            "email": "admin@sistema.com",
            "senha": "admin123"
        }
    }


# ── Health check ─────────────────────────────────────────────────────

@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}


# ── WebSockets (Notificações em Tempo Real) ──────────────────────────
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict

class ConnectionManager:
    def __init__(self):
        # Mapeia user_id -> lista de WebSockets ativos
        self.active_connections: Dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
            if len(self.active_connections[user_id]) == 0:
                del self.active_connections[user_id]

    async def send_notification(self, user_id: str, message: dict):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                await connection.send_json(message)

manager = ConnectionManager()
app.state.ws_manager = manager

@app.websocket("/ws/notifications/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    try:
        while True:
            # Mantém a conexão aberta aguardando mensagens (ping/pong)
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)