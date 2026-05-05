from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from schemas.users import LoginRequest, TokenResponse
from core.security import verify_password, create_access_token
from core.database import get_db
from models.models import Colaborador

router = APIRouter()


def _authenticate_user(db: Session, email: str, senha: str):
    user = db.query(Colaborador).filter(
        Colaborador.email == email, Colaborador.ativo == True
    ).first()

    if user and verify_password(senha, user.hashed_password):
        token = create_access_token({
            "sub": user.email,
            "user_id": str(user.id),
            "role": user.role,
        })
        return TokenResponse(access_token=token)
    return None


@router.post("/login", response_model=TokenResponse)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    token = _authenticate_user(db, credentials.email, credentials.senha)
    if token:
        return token

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas",
    )


@router.post("/token", response_model=TokenResponse)
def oauth_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    token = _authenticate_user(db, form_data.username, form_data.password)
    if token:
        return token

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas",
    )