from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select

from app.core.database import get_session
from app.core.security import get_current_admin_user
from app.models import Service, User

router = APIRouter(prefix="/services", tags=["services"])


class ServiceCreate(BaseModel):
    name: str
    description: str = ""
    price: float
    duration_minutes: int = 30


@router.get("/")
def list_services(
    session: Session = Depends(get_session),
    company_id: int = Query(..., description="ID da empresa para buscar os servicos"),
):
    """
    Retorna todos os servicos ativos da barbearia (PUBLICO).
    Obrigatório informar `company_id` na query string.
    """
    effective_id = company_id

    statement = select(Service).where(
        Service.is_active == True,
        Service.company_id == effective_id
    )
    services = session.exec(statement).all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "description": s.description,
            "price": s.price,
            "duration_minutes": s.duration_minutes,
        }
        for s in services
    ]


@router.post("/")
def create_service(
    data: ServiceCreate,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user),
):
    """
    Cria um novo servico para a empresa do admin logado.
    """
    db_service = Service(
        company_id=admin.company_id,
        name=data.name.strip(),
        description=data.description,
        price=data.price,
        duration_minutes=data.duration_minutes,
        is_active=True,
    )
    session.add(db_service)
    session.commit()
    session.refresh(db_service)

    return {
        "id": db_service.id,
        "name": db_service.name,
        "description": db_service.description,
        "price": db_service.price,
        "duration_minutes": db_service.duration_minutes,
        "is_active": db_service.is_active,
    }


@router.delete("/{service_id}")
def delete_service(
    service_id: int,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user),
):
    """
    Deleta (desativa) um servico da empresa do admin.
    """
    service = session.exec(
        select(Service).where(
            Service.id == service_id,
            Service.company_id == admin.company_id,
        )
    ).first()

    if not service:
        raise HTTPException(404, "Serviço não encontrado.")

    # Soft delete: marca como inativo
    service.is_active = False
    session.add(service)
    session.commit()

    return {"ok": True, "message": "Serviço removido com sucesso."}
