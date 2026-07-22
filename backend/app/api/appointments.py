from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select
from pydantic import BaseModel

from app.core.database import get_session
from app.core.security import get_current_company
from app.models import Appointment, AppointmentStatus, Company, User, Service

from app.services.appointment_service import (
    get_appointments_by_customer,
    get_appointments_by_barber,
    get_occupied_slots,
    update_appointment_status,
)
from app.services import push_service

router = APIRouter(prefix="/appointments", tags=["appointments"])

class AppointmentCreate(BaseModel):
    company_id: int
    service_id: int
    appointment_date: datetime
    customer_name: str
    customer_phone: str
    notes: str | None = None

class AppointmentResponse(BaseModel):
    id: int
    customer_id: int
    barber_id: int
    service_id: int
    appointment_date: datetime
    status: AppointmentStatus
    notes: str | None
    created_at: datetime

    class Config:
        from_attributes = True

# Mock da classe StatusUpdate caso esteja importada de outro lugar no seu código original
class StatusUpdate(BaseModel):
    status: AppointmentStatus

@router.post("", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
def create_appointment_route(
    appointment_data: AppointmentCreate,
    session: Session = Depends(get_session),
):
    try:
        barber = session.exec(
            select(User).where(
                User.company_id == appointment_data.company_id,
                User.role == "admin"
            )
        ).first()
        
        if not barber:
            raise ValueError("Nenhum barbeiro encontrado para esta barbearia.")

        # 🚨 Validação robusta de overbooking
        horario_ocupado = session.exec(
            select(Appointment).where(
                Appointment.barber_id == barber.id,
                Appointment.appointment_date == appointment_data.appointment_date
            )
        ).all()

        # Verifica na memória para evitar falhas do SQL com Enum
        for appt in horario_ocupado:
            status_str = appt.status.value.lower() if hasattr(appt.status, 'value') else str(appt.status).lower()
            if status_str in ['pending', 'confirmed', 'completed']:
                raise ValueError("Putz! Esse horário acabou de ser reservado por outra pessoa. Por favor, escolha outro.")

        customer = session.exec(
            select(User).where(
                User.company_id == appointment_data.company_id,
                User.phone == appointment_data.customer_phone,
                User.role == "customer"
            )
        ).first()

        if not customer:
            customer = User(
                name=appointment_data.customer_name,
                phone=appointment_data.customer_phone,
                email=f"{appointment_data.customer_phone}@{appointment_data.company_id}.cliente.com",
                hashed_password="none",
                role="customer",
                company_id=appointment_data.company_id
            )
            session.add(customer)
            session.commit()
            session.refresh(customer)

        new_appointment = Appointment(
            company_id=appointment_data.company_id,
            customer_id=customer.id,
            barber_id=barber.id,
            service_id=appointment_data.service_id,
            appointment_date=appointment_data.appointment_date,
            status=AppointmentStatus.PENDING,
            notes=f"Cliente: {appointment_data.customer_name} | {appointment_data.notes or ''}",
        )
        
        session.add(new_appointment)
        session.commit()
        session.refresh(new_appointment)

        # 🔔 Dispara a notificação push pro dono da barbearia (não deve
        # nunca quebrar a criação do agendamento caso falhe)
        try:
            service_obj = session.get(Service, appointment_data.service_id)
            service_name = service_obj.name if service_obj else "Serviço"
            time_str = appointment_data.appointment_date.strftime("%H:%M")

            push_service.notify_new_appointment(
                session=session,
                company_id=appointment_data.company_id,
                customer_name=appointment_data.customer_name,
                service_name=service_name,
                time_str=time_str,
            )
        except Exception as push_err:
            # Loga mas não impede o agendamento de ser criado
            print(f"[ERRO NOTIFICAÇÃO PUSH] {push_err}")

        return new_appointment
        
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("", response_model=list[AppointmentResponse])
def list_appointments(
    customer_id: int | None = Query(None),
    barber_id: int | None = Query(None),
    session: Session = Depends(get_session),
    company: Company = Depends(get_current_company),
):
    if customer_id:
        return get_appointments_by_customer(session, company.id, customer_id)
    if barber_id:
        return get_appointments_by_barber(session, company.id, barber_id)

    statement = session.query(Appointment).where(
        Appointment.company_id == company.id
    ).order_by(Appointment.appointment_date.desc())
    return statement.all()


@router.get("/occupied-slots")
def get_occupied_slots_route(
    company_id: int = Query(...),
    date_str: str = Query(..., alias="date", description="Formato YYYY-MM-DD"),
    session: Session = Depends(get_session)
):
    """Retorna horários ocupados resolvendo bugs de timezone e Enum do banco."""
    target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    start_dt = datetime.combine(target_date, datetime.min.time())
    end_dt = datetime.combine(target_date, datetime.max.time())

    # Seleciona o objeto inteiro para evitar que o SQLAlchemy retorne tuplas quebradas
    appointments = session.exec(
        select(Appointment)
        .where(
            Appointment.company_id == company_id,
            Appointment.appointment_date >= start_dt,
            Appointment.appointment_date <= end_dt
        )
    ).all()

    occupied_times = []
    for appt in appointments:
        # Filtra o status manualmente para garantir 100% de precisão (ignora cancelados)
        status_str = appt.status.value.lower() if hasattr(appt.status, 'value') else str(appt.status).lower()
        
        if status_str != 'canceled':
            if appt.appointment_date:
                # Extrai apenas a hora e minuto formatado perfeitamente
                occupied_times.append(appt.appointment_date.strftime("%H:%M"))

    return occupied_times


@router.patch("/{appointment_id}/status", response_model=AppointmentResponse)
def update_appointment_status_route(
    appointment_id: int,
    status_update: StatusUpdate,
    session: Session = Depends(get_session),
    company: Company = Depends(get_current_company),
):
    try:
        appointment = update_appointment_status(
            session=session,
            company_id=company.id,
            appointment_id=appointment_id,
            new_status=status_update.status,
        )
        return appointment
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))