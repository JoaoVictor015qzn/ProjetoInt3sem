from fastapi import FastAPI, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from core.database import engine, Base, get_db
from core.security import hash_password
from models.models import Colaborador
from routes import user, auth, subestacao, permissao, log_acesso

# ── Cria todas as tabelas no banco ───────────────────────────────────
Base.metadata.create_all(bind=engine)

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

# ── Routers ──────────────────────────────────────────────────────────
app.include_router(user.router, prefix="/users", tags=["Users"])
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(subestacao.router, prefix="/subestacoes", tags=["Subestações"])
app.include_router(permissao.router, prefix="/permissoes", tags=["Permissões"])
app.include_router(log_acesso.router, tags=["Acesso / Logs"])


# ── Seed: primeiro usuário admin ─────────────────────────────────────

@app.post("/seed", tags=["Setup"], status_code=status.HTTP_201_CREATED)
def seed_admin(db: Session = Depends(get_db)):
    """Cria o primeiro usuário admin. Funciona apenas se o banco estiver vazio."""
    if db.query(Colaborador).first():
        return {"msg": "Seed já executado — banco não está vazio"}

    admin = Colaborador(
        nome="Admin",
        email="admin@sistema.com",
        cpf="00000000000",
        cargo="Administrador",
        role="admin",
        hashed_password=hash_password("admin123"),
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)

    return {
        "msg": "Admin criado",
        "id": str(admin.id),
        "email": "admin@sistema.com",
        "senha": "admin123",
    }


# ── Health check ─────────────────────────────────────────────────────

@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}