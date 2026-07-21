# backend/app/api/appointments.py
from datetime import datetime, date
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select
from pydantic import BaseModel

from app.core.database import get_session
from app.core.security import get_current_company
from app.models import Appointment, AppointmentStatus, Company, User

# Removemos temporariamente as validações estritas de create_appointment
from app.services.appointment_service import (
    get_appointments_by_customer,
    get_appointments_by_barber,
    get_occupied_slots,
    update_appointment_status,
)

router = APIRouter(prefix="/appointments", tags=["appointments"])

class AppointmentCreate(BaseModel):
    """Schema atualizado para receber dados da tela PÚBLICA do cliente."""
    company_id: int
    service_id: int
    appointment_date: datetime
    customer_name: str
    customer_phone: str
    notes: str | None = None

class AppointmentResponse(BaseModel):
    """Schema de resposta de um agendamento."""
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

@router.post(
    "",
    response_model=AppointmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_appointment_route(
    appointment_data: AppointmentCreate,
    session: Session = Depends(get_session),
):
    """
    Cria um novo agendamento público.
    Acha/Cria o cliente automaticamente, verifica choque de horários e vincula ao barbeiro.
    """
    try:
        # 1. Acha o barbeiro (Admin) dono da barbearia
        barber = session.exec(
            select(User).where(
                User.company_id == appointment_data.company_id,
                User.role == "admin"
            )
        ).first()
        
        if not barber:
            raise ValueError("Nenhum barbeiro encontrado para esta barbearia.")

        # 🚨 2. O LEÃO DE CHÁCARA: Verifica se o horário já está ocupado! 🚨
        horario_ocupado = session.exec(
            select(Appointment).where(
                Appointment.barber_id == barber.id,
                Appointment.appointment_date == appointment_data.appointment_date,
                Appointment.status.in_([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED])
            )
        ).first()

        if horario_ocupado:
            raise ValueError("Putz! Esse horário acabou de ser reservado por outra pessoa. Por favor, escolha outro.")

        # 3. Verifica se o cliente já existe pelo telefone, senão cria um novo
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

        # 4. CRIA O AGENDAMENTO DIRETO NO BANCO
        new_appointment = Appointment(
            company_id=appointment_data.company_id,
            customer_id=customer.id,
            barber_id=barber.id,
            service_id=appointment_data.service_id,
            appointment_date=appointment_data.appointment_date,
            status=AppointmentStatus.PENDING, # Já cai como pendente lá pro Admin aprovar
            notes=f"Cliente: {appointment_data.customer_name} | {appointment_data.notes or ''}",
        )
        
        session.add(new_appointment)
        session.commit()
        session.refresh(new_appointment)

        return new_appointment
        
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

@router.get("", response_model=list[AppointmentResponse])
def list_appointments(
    customer_id: int | None = Query(None, description="Filtrar por cliente"),
    barber_id: int | None = Query(None, description="Filtrar por barbeiro"),
    session: Session = Depends(get_session),
    company: Company = Depends(get_current_company),
):
    """Lista agendamentos para o Painel Admin (Protegido por Token)"""
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
    """Retorna um array de strings com os horários 'HH:MM' já ocupados."""
    target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    start_dt = datetime.combine(target_date, datetime.min.time())
    end_dt = datetime.combine(target_date, datetime.max.time())

    # Busca apenas as datas/horas dos agendamentos ativos
    appointments = session.exec(
        select(Appointment.appointment_date)
        .where(
            Appointment.company_id == company_id,
            Appointment.appointment_date >= start_dt,
            Appointment.appointment_date <= end_dt,
            Appointment.status != AppointmentStatus.CANCELED  # Libera se foi cancelado
        )
    ).all()

    # Formata a saída para o React comparar facilmente
    occupied_times = [appt.strftime("%H:%M") for appt in appointments]
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
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )