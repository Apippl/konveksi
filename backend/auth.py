from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
try:
    from jose import JWTError, jwt  # type: ignore[import-not-found]
except ImportError:  # pragma: no cover - fallback when python-jose is unavailable
    import jwt as jwt  # type: ignore[import-not-found]

    class JWTError(Exception):
        pass

try:
    from pwdlib import PasswordHash  # type: ignore[import-not-found]
except ImportError:  # pragma: no cover - compatibility fallback when dependency is unavailable
    class PasswordHash:  # type: ignore[no-redef]
        def __init__(self, *args: object, **kwargs: object) -> None:
            raise RuntimeError("pwdlib is required for password hashing")

        def hash(self, password: str) -> str:
            raise RuntimeError("pwdlib is required for password hashing")

        def verify(self, plain_password: str, hashed_password: str) -> bool:
            raise RuntimeError("pwdlib is required for password hashing")

try:
    from pwdlib.hashers import BcryptHasher  # type: ignore[import-not-found]
except ImportError:  # pragma: no cover - compatibility fallback for some installs
    try:
        from pwdlib.hashers.bcrypt import BcryptHasher  # type: ignore[import-not-found,attr-defined]
    except ImportError:  # pragma: no cover
        from pwdlib.hashers import BcryptHasher  # type: ignore[import-not-found,attr-defined]

from sqlalchemy.orm import Session

from config import ACCESS_TOKEN_EXPIRE_MINUTES, SECRET_KEY
from database import get_db
import models

ALGORITHM = "HS256"

# Setup hashing pwdlib
password_hash = PasswordHash((BcryptHasher(),))
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return password_hash.verify(plain_password, hashed_password)


def buat_token(user: models.User) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user.id), "role": user.role, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    err = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token tidak valid",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: Optional[str] = payload.get("sub")
        if user_id is None:
            raise err
        user_id_int = int(user_id)
    except (JWTError, ValueError):
        raise err

    user = db.query(models.User).filter(models.User.id == user_id_int).first()
    if not user:
        raise err
    if getattr(user, "is_active", True) is False:
        raise err
    return user


def require_admin(user: models.User = Depends(get_current_user)) -> models.User:
    if user.role not in ("admin", "superadmin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Khusus admin"
        )
    return user


def require_superadmin(user: models.User = Depends(get_current_user)):
    if user.role != "superadmin":
        raise HTTPException(
            status_code=403, 
            detail="Khusus superadmin"
        )
    return user


def require_sesi_aksi_aktif(user: models.User = Depends(require_superadmin)):
    batas = user.sesi_aksi_valid_hingga
    if not batas or batas < datetime.now(timezone.utc).replace(tzinfo=None):
        raise HTTPException(
            status_code=403,
            detail="Sesi aksi sensitif sudah berakhir atau belum diverifikasi. Verifikasi OTP dulu.",
        )
    return user