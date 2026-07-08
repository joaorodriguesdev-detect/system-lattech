# backend/app/core/security.py
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, Header, HTTPException, status
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlmodel import Session

from app.core.database import get_session
from app.models import Company, TenantStatus, User, UserRole
from app.services.billing_service import sync_company_billing_state

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "chave-super-secreta-fallback-local")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise ValueError("Token inválido ou expirado")


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _suspend_company(company: Company, session: Session, reason: str) -> None:
    company.status = TenantStatus.SUSPENDED
    company.is_active = False
    session.add(company)
    session.commit()
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=reason)


def _normalize_company_subscription(company: Company, session: Session) -> Company:
    now = _utc_now()
    company_status = company.status

    if company_status is None:
        if company.is_active:
            company_status = TenantStatus.TRIAL if company.trial_end else TenantStatus.ACTIVE
        else:
            company_status = TenantStatus.SUSPENDED
        company.status = company_status

    if company_status == TenantStatus.SUSPENDED:
        _suspend_company(company, session, "Sua assinatura está suspensa. Entre em contato com o suporte.")

    if company_status == TenantStatus.TRIAL:
        trial_end = _as_utc(company.trial_end)
        if trial_end is None:
            trial_end = now + timedelta(days=30)
            company.trial_end = trial_end
            session.add(company)
            session.commit()
        if trial_end <= now:
            _suspend_company(company, session, "Seu período de teste expirou.")
        company.is_active = True
        return company

    if company_status == TenantStatus.ACTIVE:
        subscription_end = _as_utc(company.subscription_end)
        if subscription_end is None:
            if company.subscription_id:
                subscription_end = now + timedelta(days=30)
                company.subscription_end = subscription_end
                session.add(company)
                session.commit()
            else:
                _suspend_company(company, session, "Assinatura ativa sem data de vencimento válida.")
        if subscription_end <= now:
            _suspend_company(company, session, "Sua assinatura expirou. Renove para continuar acessando o sistema.")
        company.is_active = True
        return company

    _suspend_company(company, session, "Não foi possível validar o status da assinatura.")

# --- Lógica de Segurança Multi-tenant ---

def get_current_user(
    authorization: str = Header(...),
    session: Session = Depends(get_session),
) -> User:
    """
    Dependency que extrai o token JWT do header Authorization,
    decodifica e retorna o usuário autenticado.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token não fornecido ou formato inválido",
        )

    token = authorization.replace("Bearer ", "")

    try:
        payload = decode_access_token(token)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
        )

    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido: user_id não encontrado",
        )

    user = session.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado ou inativo",
        )

    return user


def get_current_company(
    user: User = Depends(get_current_user), 
    session: Session = Depends(get_session)
) -> Company:
    company = session.get(Company, user.company_id)
    
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")

    return sync_company_billing_state(company, session)

def get_current_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Acesso negado: Apenas administradores podem acessar esta rota."
        )
    return current_user