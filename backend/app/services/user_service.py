from sqlmodel import Session, select
from app.models import User, UserRole
from app.core.security import get_password_hash


def get_user_by_email(session: Session, email: str, company_id: int) -> User | None:
    """
    Busca um usuário pelo email (com isolamento de empresa).
    Retorna o usuário ou None se não encontrar.
    """
    statement = select(User).where(User.email == email, User.company_id == company_id)
    return session.exec(statement).first()


def create_user(session: Session, company_id: int, data: dict) -> User:
    """
    Cria um novo usuário com senha hasheada.

    Args:
        session: Sessão do banco de dados
        company_id: ID da empresa (multi-tenant)
        data: Dicionário com name, email, password, phone, role

    Returns:
        User: O usuário recém-criado
    """
    hashed_pw = get_password_hash(data["password"])

    user = User(
        company_id=company_id,
        name=data["name"],
        email=data["email"],
        phone=data.get("phone"),
        hashed_password=hashed_pw,
        role=data.get("role", UserRole.CUSTOMER),
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def get_barbers(session: Session, company_id: int) -> list[User]:
    """
    Retorna todos os barbeiros cadastrados e ativos (filtrado por empresa).
    """
    statement = (
        select(User)
        .where(User.role == UserRole.BARBER)
        .where(User.is_active == True)
        .where(User.company_id == company_id)
    )
    return list(session.exec(statement).all())
