from datetime import datetime
from sqlmodel import Session, select
from app.models import PostReview, PostReviewStatus
from pydantic import BaseModel

class PostReviewCreate(BaseModel):
    post_id: int
    customer_name: str
    rating: int

def get_approved_post_reviews(session: Session, post_id: int, company_id: int):
    """Retorna avaliações aprovadas de um post específico (filtrado por empresa)."""
    return session.exec(
        select(PostReview)
        .where(PostReview.post_id == post_id, PostReview.company_id == company_id, PostReview.status == PostReviewStatus.APPROVED)
    ).all()


def get_pending_post_reviews(session: Session, company_id: int):
    """Retorna avaliações de posts pendentes (filtrado por empresa)."""
    return session.exec(
        select(PostReview)
        .where(PostReview.status == PostReviewStatus.PENDING, PostReview.company_id == company_id)
        .order_by(PostReview.created_at.desc())
    ).all()


def get_all_post_reviews(session: Session, company_id: int):
    """Retorna TODAS as avaliações de posts (filtrado por empresa)."""
    return session.exec(
        select(PostReview)
        .where(PostReview.company_id == company_id)
        .order_by(PostReview.created_at.desc())
    ).all()


def create_post_review(session: Session, data: PostReviewCreate, company_id: int):
    """Cria uma nova avaliação para um post (com company_id)."""
    review = PostReview(
        post_id=data.post_id,
        company_id=company_id,
        customer_name=data.customer_name[:100],
        rating=data.rating,
        status=PostReviewStatus.PENDING,
    )
    session.add(review)
    session.commit()
    session.refresh(review)
    return review


def approve_post_review(session: Session, review_id: int, company_id: int):
    """Aprova uma avaliação de post pendente (com isolamento de empresa)."""
    review = session.exec(
        select(PostReview).where(PostReview.id == review_id, PostReview.company_id == company_id)
    ).first()
    if review and review.status == PostReviewStatus.PENDING:
        review.status = PostReviewStatus.APPROVED
        review.approved_at = datetime.utcnow()
        session.add(review)
        session.commit()
    return review


def reject_post_review(session: Session, review_id: int, company_id: int):
    """Rejeita uma avaliação de post pendente (com isolamento de empresa)."""
    review = session.exec(
        select(PostReview).where(PostReview.id == review_id, PostReview.company_id == company_id)
    ).first()
    if review and review.status == PostReviewStatus.PENDING:
        review.status = PostReviewStatus.REJECTED
        session.add(review)
        session.commit()
        session.refresh(review)
    return review


def get_pending_post_review_count(session: Session, company_id: int) -> int:
    """Retorna a quantidade de avaliações de posts pendentes (filtrado por empresa)."""
    statement = select(PostReview).where(
        PostReview.status == PostReviewStatus.PENDING,
        PostReview.company_id == company_id
    )
    return len(session.exec(statement).all())