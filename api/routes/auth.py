from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordRequestForm

from schemas.users import LoginRequest, TokenResponse
from core.security import verify_password, create_access_token
from routes.user import fake_users_db

router = APIRouter()


def _authenticate_user(email: str, senha: str):
    for user in fake_users_db:
        if user["email"] == email and user["ativo"]:
            if verify_password(senha, user["hashed_password"]):
                token = create_access_token({
                    "sub": user["email"],
                    "user_id": user["id"],
                    "role": user["role"],
                })
                return TokenResponse(access_token=token)
    return None


@router.post("/login", response_model=TokenResponse)
def login(credentials: LoginRequest):
    token = _authenticate_user(credentials.email, credentials.senha)
    if token:
        return token


@router.post("/token", response_model=TokenResponse)
def oauth_token(form_data: OAuth2PasswordRequestForm = Depends()):
    token = _authenticate_user(form_data.username, form_data.password)
    if token:
        return token

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas",
    )