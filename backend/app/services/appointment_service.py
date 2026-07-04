from datetime import datetime, date, time
from typing import List
from sqlmodel import Session, select, and_
from app.models import Appointment, WorkingHour, User, Service, AppointmentStatus


def create_appointment(
    session: Session,
    company_id: int,
    customer_id: int,
    barber_id: int,
    service_id: int,
    appointment_date: datetime,
    notes: str | None = None,
) -> Appointment:
    """
    Cria um novo agendamento após validar disponibilidade.
    Levanta ValueError se:
    - O horário não estiver disponível para o barbeiro
    - Já existir um agendamento conflitante
    - O cliente, barbeiro ou serviço não existirem
    """
    # Valida existência dos registros
    customer = session.get(User, customer_id)
    barber = session.get(User, barber_id)
    service = session.get(Service, service_id)

    if not customer or customer.company_id != company_id:
        raise ValueError("Cliente não encontrado")
    if not barber or barber.company_id != company_id or barber.role not in ["barber", "admin"]:
        raise ValueError("Barbeiro não encontrado ou não é um barbeiro válido")
    if not service or service.company_id != company_id or not service.is_active:
        raise ValueError("Serviço não encontrado ou inativo")

    # Valida disponibilidade do horário
    is_available, msg = check_availability(
        session, barber_id, appointment_date
    )
    if not is_available:
        raise ValueError(msg)

    appointment = Appointment(
        company_id=company_id,
        customer_id=customer_id,
        barber_id=barber_id,
        service_id=service_id,
        appointment_date=appointment_date,
        status=AppointmentStatus.PENDING,
        notes=notes,
    )
    session.add(appointment)
    session.commit()
    session.refresh(appointment)
    return appointment


def check_availability(
    session: Session,
    barber_id: int,
    appointment_date: datetime,
) -> tuple[bool, str]:
    """
    Verifica se um barbeiro está disponível em uma determinada data/hora.

    Regras:
    1. O dia da semana deve estar configurado no WorkingHour do barbeiro.
    2. O horário deve estar dentro do intervalo de trabalho.
    3. Não pode haver outro agendamento no mesmo horário.

    Retorna (True, "Disponível") ou (False, "Motivo da indisponibilidade").
    """
    day_of_week = appointment_date.weekday()  # 0=Segunda, 6=Domingo
    app_time = appointment_date.time()

    # Busca o WorkingHour para o barbeiro naquele dia
    wh_statement = select(WorkingHour).where(
        and_(
            WorkingHour.barber_id == barber_id,
            WorkingHour.day_of_week == day_of_week,
            WorkingHour.is_available == True,
        )
    )
    working_hour = session.exec(wh_statement).first()

    if not working_hour:
        return False, "Barbeiro não trabalha neste dia da semana"

    if not (working_hour.start_time <= app_time <= working_hour.end_time):
        return False, "Horário fora do expediente do barbeiro"

    # Verifica conflito com outros agendamentos
    conflict_statement = select(Appointment).where(
        and_(
            Appointment.barber_id == barber_id,
            Appointment.appointment_date == appointment_date,
            Appointment.status.in_(
                [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]
            ),
        )
    )
    conflict = session.exec(conflict_statement).first()

    if conflict:
        return False, "Já existe um agendamento neste horário"

    return True, "Disponível"


def get_appointments_by_customer(
    session: Session, company_id: int, customer_id: int
) -> list[Appointment]:
    """
    Retorna todos os agendamentos de um cliente específico.
    """
    statement = (
        select(Appointment)
        .where(Appointment.customer_id == customer_id, Appointment.company_id == company_id)
        .order_by(Appointment.appointment_date.desc())
    )
    return list(session.exec(statement).all())


def get_appointments_by_barber(
    session: Session, company_id: int, barber_id: int
) -> list[Appointment]:
    """
    Retorna todos os agendamentos de um barbeiro específico.
    """
    statement = (
        select(Appointment)
        .where(Appointment.barber_id == barber_id, Appointment.company_id == company_id)
        .order_by(Appointment.appointment_date.desc())
    )
    return list(session.exec(statement).all())


def update_appointment_status(
    session: Session,
    company_id: int,
    appointment_id: int,
    new_status: AppointmentStatus,
) -> Appointment:
    """
    Atualiza o status de um agendamento.
    Usado pelo admin para aprovar (COMPLETED) ou cancelar (CANCELED).
    """
    appointment = session.exec(
        select(Appointment).where(Appointment.id == appointment_id, Appointment.company_id == company_id)
    ).first()
    if not appointment:
        raise ValueError("Agendamento não encontrado")

    appointment.status = new_status
    session.add(appointment)
    session.commit()
    session.refresh(appointment)
    return appointment

def get_occupied_slots(
    session: Session,
    company_id: int,
    barber_id: int,
    target_date: date,
) -> list[datetime]:
    """
    Retorna uma lista de datetimes (horários) já ocupados para um barbeiro
    em uma data específica. O frontend Next.js usa isso para desabilitar
    os slots ocupados na tela do cliente.
    """
    # Define o início e fim do dia
    start_of_day = datetime.combine(target_date, time.min)
    end_of_day = datetime.combine(target_date, time.max)

    statement = select(Appointment).where(
        and_(
            Appointment.barber_id == barber_id,
            Appointment.company_id == company_id,
            Appointment.appointment_date >= start_of_day,
            Appointment.appointment_date <= end_of_day,
            Appointment.status.in_(
                [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]
            ),
        )
    ).order_by(Appointment.appointment_date)

    appointments = session.exec(statement).all()
    return [app.appointment_date for app in appointments]

