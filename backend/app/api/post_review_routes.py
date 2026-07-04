from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session

from app.core.database import get_session
from app.core.security import get_current_company
from app.models import Company
from app.services.post_review_service import (
    PostReviewCreate, get_approved_post_reviews, get_pending_post_reviews,
    get_all_post_reviews, create_post_review, approve_post_review,
    reject_post_review, get_pending_post_review_count,
)
from app.api.admin_routes import get_current_admin_user

router = APIRouter(prefix="/post-reviews", tags=["Avaliações de Posts"])

@router.get("/")
def list_approved_post_reviews(
    company_id: int, # <-- Pública
    post_id: int = Query(description="ID do post"),
    session: Session = Depends(get_session),
):
    reviews = get_approved_post_reviews(session, post_id, company_id)
    return reviews

@router.post("/", status_code=status.HTTP_201_CREATED)
def submit_post_review(
    data: PostReviewCreate,
    company_id: int, # <-- Pública
    session: Session = Depends(get_session),
):
    if data.rating < 1 or data.rating > 5:
        raise HTTPException(status_code=400, detail="A nota deve ser entre 1 e 5.")
    if not data.customer_name.strip():
        data.customer_name = "Anônimo"

    review = create_post_review(session, data, company_id)
    if not review: raise HTTPException(status_code=400, detail="Erro ao criar avaliação.")
    return {"message": "Avaliação enviada para aprovação!", "id": review.id}

@router.get("/pending")
def list_pending_post_reviews(admin=Depends(get_current_admin_user), session: Session = Depends(get_session)):
    return get_pending_post_reviews(session, admin.company_id)

@router.get("/all")
def list_all_post_reviews(admin=Depends(get_current_admin_user), session: Session = Depends(get_session)):
    return get_all_post_reviews(session, admin.company_id)

@router.patch("/{review_id}/approve")
def approve_post_review_endpoint(review_id: int, admin=Depends(get_current_admin_user), session: Session = Depends(get_session)):
    review = approve_post_review(session, review_id, admin.company_id)
    if not review: raise HTTPException(status_code=404, detail="Não encontrada.")
    return {"message": "Avaliação aprovada!", "review": review}

@router.patch("/{review_id}/reject")
def reject_post_review_endpoint(review_id: int, admin=Depends(get_current_admin_user), session: Session = Depends(get_session)):
    review = reject_post_review(session, review_id, admin.company_id)
    if not review: raise HTTPException(status_code=404, detail="Não encontrada.")
    return {"message": "Avaliação rejeitada!", "review": review}

@router.get("/pending/count")
def pending_post_reviews_count(admin=Depends(get_current_admin_user), session: Session = Depends(get_session)):
    return {"count": get_pending_post_review_count(session, admin.company_id)}