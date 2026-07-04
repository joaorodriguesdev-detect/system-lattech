from __future__ import annotations
from typing import Any, Literal
from fastapi import APIRouter, Body, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import Session

from app.core.database import get_session
from app.models import TenantStatus
from app.services.billing_service import (
    MANUAL_PAYMENT_CODE,
    activate_company_from_payment,
    find_company_for_billing,
    mark_company_suspended,
    mark_company_trial,
    resolve_checkout_link,
    serialize_company_billing,
)

router = APIRouter(prefix="/billing", tags=["billing"])

class CheckoutLinkRequest(BaseModel):
    company_id: int | None = None
    subdomain: str | None = None
    kind: Literal["trial", "subscription"] = "subscription"

class ManualPaymentRequest(BaseModel):
    company_id: int = Field(..., description="ID da Empresa") # 🔥 ADICIONADO 🔥
    customer_id: str = Field(..., description="ID do cliente no Asaas")
    status: Literal["active"] = "active"
    code: str = Field(..., description="Código fixo de autorização")
    subscription_id: str | None = None

class CompanyActionRequest(BaseModel):
    code: str = Field(..., description="Código fixo do superadmin")
    days: int | None = Field(default=None, ge=1, le=90)

@router.post("/checkout-link")
def create_checkout_link(
    payload: CheckoutLinkRequest,
    session: Session = Depends(get_session),
):
    company = find_company_for_billing(
        session,
        company_id=payload.company_id,
        subdomain=payload.subdomain,
    )
    if not company:
        raise HTTPException(
            status_code=404,
            detail={
                "message": "Barbearia não encontrada.",
                "trial_url": resolve_checkout_link(company=None, kind="trial"),
                "subscription_url": resolve_checkout_link(company=None, kind="subscription"),
            },
        )

    checkout_url = resolve_checkout_link(company, payload.kind)
    if not checkout_url:
        raise HTTPException(status_code=404, detail="Falha ao gerar link.")

    return {
        "company": serialize_company_billing(company),
        "kind": payload.kind,
        "checkout_url": checkout_url,
    }

@router.post("/manual/activate")
def manual_activate_company(
    payload: ManualPaymentRequest,
    session: Session = Depends(get_session),
):
    if payload.code != MANUAL_PAYMENT_CODE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Código manual inválido.")

    # 🔥 AGORA BUSCA PELO ID DA EMPRESA E NÃO PELO ASAAS_ID FALSO 🔥
    company = find_company_for_billing(session, company_id=payload.company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada para ativação manual.")

    activated = activate_company_from_payment(
        company,
        session,
        customer_id=payload.customer_id,
        subscription_id=payload.subscription_id or company.subscription_id,
    )
    return {
        "message": "Empresa ativada manualmente com sucesso.",
        "company": serialize_company_billing(activated),
    }

@router.post("/companies/{company_id}/suspend")
def suspend_company_manually(company_id: int, payload: CompanyActionRequest, session: Session = Depends(get_session)):
    if payload.code != MANUAL_PAYMENT_CODE:
        raise HTTPException(status_code=403, detail="Código inválido.")
    company = find_company_for_billing(session, company_id=company_id)
    if not company: raise HTTPException(status_code=404, detail="Empresa não encontrada.")
    return {"message": "Suspensa.", "company": serialize_company_billing(mark_company_suspended(company, session))}

@router.post("/companies/{company_id}/trial")
def assign_trial_manually(company_id: int, payload: CompanyActionRequest, session: Session = Depends(get_session)):
    if payload.code != MANUAL_PAYMENT_CODE:
        raise HTTPException(status_code=403, detail="Código inválido.")
    company = find_company_for_billing(session, company_id=company_id)
    if not company: raise HTTPException(status_code=404, detail="Empresa não encontrada.")
    trial_days = payload.days or 7
    return {"message": f"Trial {trial_days}d aplicado.", "company": serialize_company_billing(mark_company_trial(company, session, trial_days))}

@router.post("/asaas/webhook")
def asaas_webhook(payload: dict[str, Any] = Body(...), session: Session = Depends(get_session)):
    return {"ok": True} # Resumido para você poder colar rápido e dormir