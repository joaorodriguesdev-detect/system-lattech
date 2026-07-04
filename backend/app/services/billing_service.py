import os
import httpx
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from sqlmodel import Session, select
from app.models import Company, TenantStatus

load_dotenv()

ASAAS_API_KEY = os.getenv("ASAAS_API_KEY")
ASAAS_API_URL = os.getenv("ASAAS_API_URL", "https://sandbox.asaas.com/api/v3")
MANUAL_PAYMENT_CODE = "ionbarber-active-2026"
PLAN_VALUE = 97.00 

def get_asaas_headers():
    return {
        "access_token": ASAAS_API_KEY,
        "Content-Type": "application/json"
    }

def find_company_for_billing(session: Session, company_id: int = None, subdomain: str = None, asaas_customer_id: str = None, subscription_id: str = None) -> Company | None:
    query = select(Company)
    if company_id:
        query = query.where(Company.id == company_id)
    elif subdomain:
        query = query.where(Company.subdomain == subdomain)
    elif asaas_customer_id:
        query = query.where(Company.asaas_customer_id == asaas_customer_id)
    elif subscription_id:
        query = query.where(Company.subscription_id == subscription_id)
    else:
        return None
    return session.exec(query).first()

def serialize_company_billing(company: Company | None) -> dict:
    if not company:
        return {}
    return {
        "id": company.id,
        "name": company.name,
        "subdomain": company.subdomain,
        "status": company.status,
        "trial_end": company.trial_end.isoformat() if company.trial_end else None,
        "subscription_end": company.subscription_end.isoformat() if company.subscription_end else None,
        "asaas_customer_id": company.asaas_customer_id,
        "subscription_id": company.subscription_id,
    }

def resolve_checkout_link(company: Company | None, kind: str) -> str:
    if not company:
        return "https://seusite.com.br/planos"
    payload = {
        "name": f"Assinatura LAT System - {company.name}",
        "description": f"Plano Mensal - Sistema de Gestão para Barbearia {company.name}",
        "chargeType": "RECURRENT",
        "value": PLAN_VALUE,
        "billingType": "UNDEFINED",
        "subscriptionCycle": "MONTHLY",
        "dueDateLimitDays": 3
    }
    try:
        resp = httpx.post(f"{ASAAS_API_URL}/paymentLinks", json=payload, headers=get_asaas_headers())
        resp.raise_for_status()
        data = resp.json()
        return data.get("url", "https://seusite.com.br/erro-checkout")
    except Exception as e:
        print(f"Erro ao gerar link no Asaas: {e}")
        return "https://seusite.com.br/erro-checkout"

def activate_company_from_payment(company: Company, session: Session, customer_id: str = None, subscription_id: str = None) -> Company:
    company.status = TenantStatus.ACTIVE
    company.subscription_end = datetime.now(timezone.utc) + timedelta(days=30)
    if customer_id:
        company.asaas_customer_id = customer_id
    if subscription_id:
        company.subscription_id = subscription_id
    session.add(company)
    session.commit()
    session.refresh(company)
    return company

def mark_company_suspended(company: Company, session: Session) -> Company:
    company.status = TenantStatus.SUSPENDED
    session.add(company)
    session.commit()
    session.refresh(company)
    return company

def mark_company_trial(company: Company, session: Session, trial_days: int = 7) -> Company:
    company.status = TenantStatus.TRIAL
    company.trial_end = datetime.now(timezone.utc) + timedelta(days=trial_days)
    company.subscription_end = company.trial_end
    session.add(company)
    session.commit()
    session.refresh(company)
    return company

# 🔥 A CURA DO FUSO HORÁRIO 🔥
def _make_aware(dt):
    if not dt:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt

def sync_company_billing_state(company: Company, session: Session) -> Company:
    now = datetime.now(timezone.utc)
    updated = False

    trial_end = _make_aware(company.trial_end)
    sub_end = _make_aware(company.subscription_end)

    if company.status == TenantStatus.TRIAL and trial_end and now > trial_end:
        company.status = TenantStatus.SUSPENDED
        updated = True

    if company.status == TenantStatus.ACTIVE and sub_end and now > sub_end:
        company.status = TenantStatus.SUSPENDED
        updated = True

    if updated:
        session.add(company)
        session.commit()
        session.refresh(company)
        
    return company