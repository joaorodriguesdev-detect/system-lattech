import os
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlmodel import Session, select
from pydantic import BaseModel

from app.core.database import get_session
from app.models import Company, TenantStatus, User, Appointment, Service, Post, PostReview, Review, WorkingHour, Product, CompanyBanner
from app.api.auth import get_password_hash
from app.services.billing_service import serialize_company_billing, sync_company_billing_state

router = APIRouter(prefix="/system", tags=["System (Super Admin)"])

# A sua Chave Mestra! 
MASTER_TOKEN = os.getenv("MASTER_TOKEN", "fallback-seguro-local")

# ==========================================
# MODELOS DE ENTRADA (Pydantic)
# ==========================================
class ProvisionTenantRequest(BaseModel):
    company_name: str
    subdomain: str
    admin_name: str
    admin_email: str
    admin_password: str
    trial_days: int = 7

class SuperAdminLoginRequest(BaseModel):
    email: str
    password: str

# ==========================================
# ROTA DE LOGIN DO SUPER ADMIN
# ==========================================
@router.post("/login")
def login_superadmin(data: SuperAdminLoginRequest):
    """Autentica o SuperAdmin e devolve o token de acesso."""
    # Valida um e-mail fixo corporativo e a Senha Mestra
    if data.email == "admin@lattech.com.br" and data.password == MASTER_TOKEN:
        return {
            "access_token": MASTER_TOKEN, 
            "message": "Acesso Orbital Autorizado."
        }
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas. Acesso Negado."
    )

# ==========================================
# ROTAS PROTEGIDAS DO SISTEMA
# ==========================================
@router.post("/provision-tenant")
def create_new_company_and_admin(
    data: ProvisionTenantRequest,
    x_master_token: str = Header(None, description="detect@ion!2001#"),
    db: Session = Depends(get_session)
):
    """Cria a Barbearia E o Usuário Dono de uma vez só!"""
    if x_master_token != MASTER_TOKEN:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token Mestre Inválido. Acesso Negado.")
    
    existing_user = db.exec(select(User).where(User.email == data.admin_email)).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Este e-mail já está em uso por outro dono.")

    existing_company = db.exec(select(Company).where(Company.subdomain == data.subdomain)).first()
    if existing_company:
        raise HTTPException(status_code=400, detail="Este subdomínio já está em uso por outra barbearia.")

    try:
        trial_days = data.trial_days
        if trial_days not in (7, 15, 30):
            raise HTTPException(status_code=400, detail="trial_days deve ser 7, 15 ou 30")
        
        trial_end = datetime.now(timezone.utc) + timedelta(days=trial_days)
        agora = datetime.now(timezone.utc)
        nova_empresa = Company(
            name=data.company_name,
            subdomain=data.subdomain,
            status=TenantStatus.TRIAL,
            trial_end=trial_end,
            subscription_end=trial_end,
            is_active=True,
            data_cadastro=agora,
        )
        db.add(nova_empresa)
        db.commit()
        db.refresh(nova_empresa)

        novo_admin = User(
            name=data.admin_name,
            email=data.admin_email,
            hashed_password=get_password_hash(data.admin_password),
            role="admin",
            company_id=nova_empresa.id
        )
        db.add(novo_admin)
        db.commit()
        
        return {
            "message": "Barbearia provisionada com sucesso! 🎉",
            "company_id": nova_empresa.id,
            "subdomain": nova_empresa.subdomain
        }
    except Exception as e:
        db.rollback() 
        raise HTTPException(status_code=500, detail=f"Erro crítico ao provisionar: {str(e)}")

@router.delete("/companies/{company_id}")
def delete_company(
    company_id: int,
    x_master_token: str = Header(None, description="Senha mestre do sistema"),
    db: Session = Depends(get_session)
):
    """EXCLUI DEFINITIVAMENTE uma empresa e TODOS os dados vinculados."""
    if x_master_token != MASTER_TOKEN:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token Mestre Inválido. Acesso Negado.")
    
    if company_id == 1:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="A empresa principal (ID=1) não pode ser excluída.")
    
    company = db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")
    
    try:
        post_reviews = db.exec(select(PostReview).where(PostReview.company_id == company_id)).all()
        for pr in post_reviews: db.delete(pr)
        
        posts = db.exec(select(Post).where(Post.company_id == company_id)).all()
        for p in posts: db.delete(p)
        
        reviews = db.exec(select(Review).where(Review.company_id == company_id)).all()
        for r in reviews: db.delete(r)
        
        appointments = db.exec(select(Appointment).where(Appointment.company_id == company_id)).all()
        for a in appointments: db.delete(a)
        
        working_hours = db.exec(select(WorkingHour).where(WorkingHour.company_id == company_id)).all()
        for wh in working_hours: db.delete(wh)
        
        services = db.exec(select(Service).where(Service.company_id == company_id)).all()
        for s in services: db.delete(s)
        
        users = db.exec(select(User).where(User.company_id == company_id)).all()
        for u in users: db.delete(u)
        
        db.delete(company)
        db.commit()
        
        return {
            "message": f"Empresa #{company_id} e todos os dados vinculados foram excluídos permanentemente.",
            "company_id": company_id,
            "company_name": company.name
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erro ao excluir empresa: {str(e)}")

@router.get("/companies")
def list_all_companies(
    x_master_token: str = Header(None, description="Senha mestre do sistema"), # 🔥 ROTA AGORA BLINDADA
    session: Session = Depends(get_session)
):
    """Lista todas as empresas na tabela do Super Admin."""
    if x_master_token != MASTER_TOKEN:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token Mestre Inválido. Acesso Negado ao banco de dados.")
        
    companies = [sync_company_billing_state(company, session) for company in session.exec(select(Company)).all()]
    return [serialize_company_billing(company) for company in companies]


# ==========================================
# ROTAS PÚBLICAS (Lookup / Vitrine)
# ==========================================
@router.get("/companies/lookup")
def lookup_company(subdomain: str, db: Session = Depends(get_session)):
    """O detetive que descobre qual empresa é pelo subdomínio lvh.me"""
    company = db.exec(select(Company).where(Company.subdomain == subdomain)).first()
    if not company: raise HTTPException(status_code=404, detail="Barbearia não encontrada")
    company = sync_company_billing_state(company, db)

    return {
        "id": company.id,
        "name": company.name,
        "subdomain": company.subdomain,
        "logo_url": company.logo_url,
        "address": company.address,
        "map_url": company.map_url,
        "status": company.status,
        "trial_end": company.trial_end,
        "subscription_end": company.subscription_end,
        "subscription_id": company.subscription_id,
        "asaas_customer_id": company.asaas_customer_id,
        "whatsapp_number": company.whatsapp_number,
        "address": company.address,
        "map_url": company.map_url
    }

@router.get("/companies/{company_id}/banners")
def get_company_banners(company_id: int, db: Session = Depends(get_session)):
    """Rota PÚBLICA que retorna os banners da vitrine ordenados pelo campo order."""
    banners = db.exec(select(CompanyBanner).where(CompanyBanner.company_id == company_id).order_by(CompanyBanner.order)).all()
    return banners

@router.get("/companies/{company_id}/products")
def get_public_products(company_id: int, db: Session = Depends(get_session)):
       """Rota PÚBLICA para a vitrine do cliente ver os produtos reais."""
       products = db.exec(select(Product).where(Product.company_id == company_id)).all()
       return products