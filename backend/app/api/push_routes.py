# backend/app/api/push_routes.py
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel

from app.core.database import get_session
from app.core.security import get_current_admin_user
from app.models import User, PushSubscription

router = APIRouter(prefix="/admin/push", tags=["push-notifications"])


@router.get("/vapid-public-key")
def get_vapid_public_key():
    """Chave pública que o frontend usa pra criar a inscrição no navegador."""
    public_key = os.getenv("VAPID_PUBLIC_KEY")
    if not public_key:
        raise HTTPException(500, "VAPID_PUBLIC_KEY não configurada no servidor.")
    return {"publicKey": public_key}


class SubscriptionKeys(BaseModel):
    p256dh: str
    auth: str


class SubscriptionPayload(BaseModel):
    endpoint: str
    keys: SubscriptionKeys


@router.post("/subscribe")
def subscribe(
    data: SubscriptionPayload,
    admin: User = Depends(get_current_admin_user),
    session: Session = Depends(get_session),
):
    """Salva (ou atualiza) a inscrição de notificações do navegador do admin."""
    existing = session.exec(
        select(PushSubscription).where(PushSubscription.endpoint == data.endpoint)
    ).first()

    if existing:
        existing.p256dh = data.keys.p256dh
        existing.auth = data.keys.auth
        existing.user_id = admin.id
        existing.company_id = admin.company_id
        session.add(existing)
        session.commit()
        return {"ok": True, "message": "Inscrição atualizada."}

    new_sub = PushSubscription(
        company_id=admin.company_id,
        user_id=admin.id,
        endpoint=data.endpoint,
        p256dh=data.keys.p256dh,
        auth=data.keys.auth,
    )
    session.add(new_sub)
    session.commit()
    return {"ok": True, "message": "Inscrito com sucesso."}


class UnsubscribePayload(BaseModel):
    endpoint: str


@router.post("/unsubscribe")
def unsubscribe(
    data: UnsubscribePayload,
    admin: User = Depends(get_current_admin_user),
    session: Session = Depends(get_session),
):
    existing = session.exec(
        select(PushSubscription).where(
            PushSubscription.endpoint == data.endpoint,
            PushSubscription.company_id == admin.company_id,
        )
    ).first()

    if existing:
        session.delete(existing)
        session.commit()

    return {"ok": True, "message": "Inscrição removida."}