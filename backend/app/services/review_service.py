from datetime import datetime
from sqlmodel import Session, select
from app.models import Review, ReviewStatus
from pydantic import BaseModel


class ReviewCreate(BaseModel):
    customer_name: str
    rating: int
    comment: str


def get_approved_reviews(session: Session, company_id: int):
    """Retorna avaliações aprovadas (filtrado por empresa)."""
    statement = (
        select(Review)
        .where(Review.status == ReviewStatus.APPROVED, Review.company_id == company_id)
        .order_by(Review.approved_at.desc())
    )
    return session.exec(statement).all()


def create_review(session: Session, data: ReviewCreate, company_id: int):
    """Cria uma nova avaliação com status PENDING (com company_id)."""
    review = Review(
        company_id=company_id,
        customer_name=data.customer_name,
        rating=data.rating,
        comment=data.comment,
        status=ReviewStatus.PENDING,
    )
    session.add(review)
    session.commit()
    session.refresh(review)
    return review


def get_pending_reviews(session: Session, company_id: int):
    """Retorna avaliações pendentes de aprovação (filtrado por empresa)."""
    statement = (
        select(Review)
        .where(Review.status == ReviewStatus.PENDING, Review.company_id == company_id)
        .order_by(Review.created_at.desc())
    )
    return session.exec(statement).all()


def approve_review(session: Session, review_id: int, company_id: int) -> Review | None:
    """Aprova uma avaliação pendente (com isolamento de empresa)."""
    review = session.exec(
        select(Review).where(Review.id == review_id, Review.company_id == company_id)
    ).first()
    if not review or review.status != ReviewStatus.PENDING:
        return None
    review.status = ReviewStatus.APPROVED
    review.approved_at = datetime.utcnow()
    session.add(review)
    session.commit()
    session.refresh(review)
    return review


def reject_review(session: Session, review_id: int, company_id: int) -> Review | None:
    """Rejeita uma avaliação pendente (com isolamento de empresa)."""
    review = session.exec(
        select(Review).where(Review.id == review_id, Review.company_id == company_id)
    ).first()
    if not review or review.status != ReviewStatus.PENDING:
        return None
    review.status = ReviewStatus.REJECTED
    session.add(review)
    session.commit()
    session.refresh(review)
    return review


def get_all_reviews(session: Session, company_id: int):
    """Retorna TODAS as avaliações (admin) filtrado por empresa.
    Ordenadas da mais recente para a mais antiga."""
    statement = (
        select(Review)
        .where(Review.company_id == company_id)
        .order_by(Review.created_at.desc())
    )
    return session.exec(statement).all()


def get_pending_count(session: Session, company_id: int) -> int:
    """Retorna a quantidade de avaliações pendentes (filtrado por empresa)."""
    statement = (
        select(Review)
        .where(Review.status == ReviewStatus.PENDING, Review.company_id == company_id)
    )
    return len(session.exec(statement).all())
