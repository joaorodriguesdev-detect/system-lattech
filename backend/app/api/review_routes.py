from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.core.database import get_session
from app.core.security import get_current_company
from app.models import Company
from app.services.review_service import (
    ReviewCreate, get_approved_reviews, create_review, get_pending_reviews,
    approve_review, reject_review, get_all_reviews, get_pending_count,
)
from app.api.admin_routes import get_current_admin_user

router = APIRouter(prefix="/reviews", tags=["Avaliacoes"])

@router.get("/")
def list_approved_reviews(
    company_id: int, # <-- Pública
    session: Session = Depends(get_session),
):
    reviews = get_approved_reviews(session, company_id)
    return reviews

@router.post("/", status_code=status.HTTP_201_CREATED)
def submit_review(
    data: ReviewCreate,
    company_id: int, # <-- Pública
    session: Session = Depends(get_session),
):
    if len(data.comment) > 50:
        raise HTTPException(status_code=400, detail="O comentario deve ter no maximo 50 caracteres.")
    if data.rating < 1 or data.rating > 5:
        raise HTTPException(status_code=400, detail="A nota deve ser entre 1 e 5.")
    review = create_review(session, data, company_id)
    return {"message": "Avaliacao enviada para aprovacao!", "id": review.id}

@router.get("/pending")
def list_pending_reviews(admin=Depends(get_current_admin_user), session: Session = Depends(get_session)):
    return get_pending_reviews(session, admin.company_id)

@router.patch("/{review_id}/approve")
def approve_review_endpoint(review_id: int, admin=Depends(get_current_admin_user), session: Session = Depends(get_session)):
    review = approve_review(session, review_id, admin.company_id)
    if not review: raise HTTPException(status_code=404, detail="Não encontrada.")
    return {"message": "Avaliacao aprovada!", "review": review}

@router.patch("/{review_id}/reject")
def reject_review_endpoint(review_id: int, admin=Depends(get_current_admin_user), session: Session = Depends(get_session)):
    review = reject_review(session, review_id, admin.company_id)
    if not review: raise HTTPException(status_code=404, detail="Não encontrada.")
    return {"message": "Avaliacao rejeitada!", "review": review}

@router.get("/all")
def list_all_reviews(admin=Depends(get_current_admin_user), session: Session = Depends(get_session)):
    return get_all_reviews(session, admin.company_id)

@router.get("/pending/count")
def pending_reviews_count(admin=Depends(get_current_admin_user), session: Session = Depends(get_session)):
    return {"count": get_pending_count(session, admin.company_id)}