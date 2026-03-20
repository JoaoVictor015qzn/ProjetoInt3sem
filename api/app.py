from datetime import datetime

from fastapi import FastAPI, status

from routes import user, auth
from schemas.users import UserCreate, UserRole
from core.security import hash_password
from routes.user import fake_users_db

app = FastAPI(
    title="Sistema de Controle de Acesso — Subestação",
    version="1.0.0",
)

app.include_router(user.router, prefix="/users", tags=["Users"])
app.include_router(auth.router, prefix="/auth", tags=["Auth"])


# ── Seed: primeiro usuário admin ─────────────────────────────────────

@app.post("/seed", tags=["Setup"], status_code=status.HTTP_201_CREATED)
def seed_admin():
    """Cria o primeiro usuário admin. Funciona apenas se o banco estiver vazio."""
    if fake_users_db:
        return {"msg": "Seed já executado — banco não está vazio"}

    admin = {
        "id": 1,
        "nome": "Admin",
        "email": "admin@sistema.com",
        "cpf": "00000000000",
        "cargo": "Administrador",
        "rfid_uid": None,
        "role": UserRole.admin.value,
        "hashed_password": hash_password("admin123"),
        "ativo": True,
        "criado_em": datetime.utcnow(),
    }
    fake_users_db.append(admin)

    # Atualiza o contador de IDs
    import routes.user as user_module
    user_module.user_id_counter = 2

    return {"msg": "Admin criado", "email": "admin@sistema.com", "senha": "admin123"}