"""Password hashing, JWT issuing/verification and FastAPI auth dependencies."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import bcrypt as _bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

# passlib 1.7.4 reads bcrypt.__about__.__version__ to detect its backend, and
# bcrypt removed that attribute in 4.1. The probe is wrapped in a try/except so
# hashing still works, but it logs a full traceback on every start-up. Restoring
# the attribute keeps the console clean without pinning an ancient bcrypt.
if not hasattr(_bcrypt, "__about__"):  # pragma: no cover - environment shim
    class _About:
        __version__ = getattr(_bcrypt, "__version__", "4.2.1")

    _bcrypt.__about__ = _About()  # type: ignore[attr-defined]

from passlib.context import CryptContext  # noqa: E402

from config import settings
from database import get_db
from models import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# auto_error=False so anonymous requests reach the endpoint instead of 401ing;
# /api/analyze deliberately works without a login.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def hash_password(password: str) -> str:
    # bcrypt silently truncates past 72 bytes; do it explicitly so a long
    # password can never raise at signup time.
    return pwd_context.hash(password[:72])


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(plain[:72], hashed)
    except ValueError:
        return False


def create_access_token(subject: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    payload = {"sub": subject, "role": role, "exp": expire}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError:
        return None


def get_optional_user(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    """Resolve the caller if a valid token was sent, otherwise return None."""
    if not token:
        return None
    payload = decode_token(token)
    if not payload or not payload.get("sub"):
        return None
    return db.query(User).filter(User.email == payload["sub"]).first()


def get_current_user(user: User | None = Depends(get_optional_user)) -> User:
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Please sign in to continue.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_roles(*roles: str):
    """Dependency factory: allow only the listed roles."""

    def _checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )
        return user

    return _checker


require_analyst = require_roles("analyst", "admin")
require_admin = require_roles("admin")
