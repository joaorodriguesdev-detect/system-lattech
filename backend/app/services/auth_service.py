from app.core.security import (
    get_password_hash as hash_password,
    verify_password,
    create_access_token,
)
from app.models import User
from sqlmodel import Session


def authenticate_user(session: Session, email: str, password: str) -> User | None:
    """
    Autentica um usuário verificando email e senha.
    Retorna o usuário se as credenciais forem válidas, ou None.
    """
    user = session.query(User).filter(User.email == email).first()
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def register_user_service(
    session: Session,
    company_id: int,
    name: str,
    email: str,
    password: str,
    phone: str | None = None,
    role: str = "customer",
) -> User:
    """
    Cria um novo usuário com senha hasheada.
    Levanta ValueError se o email já existir.
    """
    existing = session.query(User).filter(User.email == email, User.company_id == company_id).first()
    if existing:
        raise ValueError("Email já cadastrado nesta empresa")

    hashed_pw = hash_password(password)
    user = User(
        company_id=company_id,
        name=name,
        email=email,
        phone=phone,
        hashed_password=hashed_pw,
        role=role,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
