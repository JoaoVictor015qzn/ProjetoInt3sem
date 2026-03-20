from fastapi import Depends, HTTPException, status
from core.security import get_current_user


def require_role(*allowed_roles: str):
    """Dependency factory — restringe o endpoint aos roles informados."""

    def _check(current_user: dict = Depends(get_current_user)):
        if current_user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permissão insuficiente",
            )
        return current_user

    return _check
