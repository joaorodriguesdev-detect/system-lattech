from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session
from pydantic import BaseModel, EmailStr

from app.core.database import get_session
from app.core.security import get_current_company
from app.models import User, UserRole, Company
from app.services import user_service

router = APIRouter(prefix="/users", tags=["users"])


class UserCreate(BaseModel):
    """Schema para criação de usuário via API."""
    name: str
    email: str
    password: str
    phone: str | None = None
    role: UserRole = UserRole.CUSTOMER


class UserResponse(BaseModel):
    """Schema de resposta com dados públicos do usuário."""
    id: int
    name: str
    email: str
    phone: str | None
    role: UserRole
    is_active: bool

    class Config:
        from_attributes = True


@router.post("/", status_code=status.HTTP_201_CREATED)
def register_user(
    user_in: UserCreate,
    session: Session = Depends(get_session),
    company: Company = Depends(get_current_company),
):
    """Rota para cadastrar novos clientes ou barbeiros"""
    # Verifica se o email já está cadastrado nesta empresa
    existing_user = user_service.get_user_by_email(session, user_in.email, company.id)
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Este e-mail já está cadastrado no sistema."
        )
    
    # Converte o schema para dicionário e chama o service
    new_user = user_service.create_user(session, company.id, user_in.model_dump())
    return {"id": new_user.id, "name": new_user.name, "role": new_user.role}
    
@router.get("/barbers", response_model=list[UserResponse])
def list_barbers(
    session: Session = Depends(get_session),
    company: Company = Depends(get_current_company),
):
    """
    Retorna a lista de todos os barbeiros cadastrados e ativos.
    """
    barbers = user_service.get_barbers(session, company.id)
    return barbers
