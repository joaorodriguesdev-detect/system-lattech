from datetime import datetime, date, time, timedelta
from sqlmodel import Session, select, func
from app.models import Appointment, AppointmentStatus, Service, User, Review, ReviewStatus

def get_dashboard_metrics(session: Session, company_id: int, start_date: date | None = None, end_date: date | None = None) -> dict:
    if not end_date: end_date = date.today()
    if not start_date: start_date = end_date - timedelta(days=30)

    # Todas as queries agora filtram por company_id
    base_query = lambda model: select(func.count(model.id)).where(model.company_id == company_id)

    completed_count = session.exec(base_query(Appointment).where(Appointment.status == AppointmentStatus.COMPLETED)).one()
    canceled_count = session.exec(base_query(Appointment).where(Appointment.status == AppointmentStatus.CANCELED)).one()
    pending_count = session.exec(base_query(Appointment).where(Appointment.status == AppointmentStatus.PENDING)).one()
    total_appointments = session.exec(base_query(Appointment)).one()
    barbers_count = session.exec(base_query(User).where(User.role == "barber")).one()
    pending_reviews_count = session.exec(base_query(Review).where(Review.status == ReviewStatus.PENDING)).one()

    revenue = session.exec(
        select(func.sum(Service.price))
        .join(Appointment, Appointment.service_id == Service.id)
        .where(Appointment.status == AppointmentStatus.COMPLETED, Appointment.company_id == company_id)
    ).one() or 0.0

    return {
        "total_appointments": total_appointments,
        "completed_appointments": completed_count,
        "canceled_appointments": canceled_count,
        "pending_appointments": pending_count,
        "revenue": round(revenue, 2),
        "total_barbers": barbers_count,
        "pending_reviews": pending_reviews_count,
    }