from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlmodel import Session, select
from pydantic import BaseModel

from app.core.database import get_session
# 👇 Ajustado para buscar do lugar certo e não dar erro
from app.models import Company, TenantStatus, User, Appointment, Service, Post, PostReview, Review, WorkingHour, Product, CompanyBanner
from app.api.auth import get_password_hash
from app.services.billing_service import serialize_company_billing, sync_company_billing_state

router = APIRouter(prefix="/system", tags=["System (Super Admin)"])

# A sua Chave Mestra! 
MASTER_TOKEN = "detect@ion!2001#"

# 👇 Modelo JSON para receber tudo de uma vez 👇
class ProvisionTenantRequest(BaseModel):
    company_name: str
    subdomain: str
    admin_name: str
    admin_email: str
    admin_password: str
    trial_days: int = 7

@router.post("/provision-tenant")
def create_new_company_and_admin(
    data: ProvisionTenantRequest,
    x_master_token: str = Header(None, description="detect@ion!2001#"),
    db: Session = Depends(get_session)
):
    """Cria a Barbearia E o Usuário Dono de uma vez só!"""
    
    # 1. O Segurança da Porta
    if x_master_token != MASTER_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Token Mestre Inválido. Acesso Negado."
        )
    
    # 2. Verifica se o e-mail já existe
    existing_user = db.exec(select(User).where(User.email == data.admin_email)).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Este e-mail já está em uso por outro dono.")

    # 3. Verifica se o subdomínio já existe
    existing_company = db.exec(select(Company).where(Company.subdomain == data.subdomain)).first()
    if existing_company:
        raise HTTPException(status_code=400, detail="Este subdomínio já está em uso por outra barbearia.")

    try:
        # Valida trial_days
        trial_days = data.trial_days
        if trial_days not in (7, 15, 30):
            raise HTTPException(status_code=400, detail="trial_days deve ser 7, 15 ou 30")
        
        # 4. Cria a Barbearia com o Subdomínio
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

        # 5. Cria o Usuário Dono e amarra na empresa nova
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
    
    # 1. Verifica o token mestre
    if x_master_token != MASTER_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token Mestre Inválido. Acesso Negado."
        )
    
    # 2. Bloqueia exclusão da empresa ID=1 (proteção)
    if company_id == 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="A empresa principal (ID=1) não pode ser excluída."
        )
    
    # 3. Verifica se a empresa existe
    company = db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")
    
    try:
                # 4. Exclusão em cascata manual (ordem correta para FKs)
        
        # 4a. post_reviews vinculados aos posts desta empresa
        post_reviews = db.exec(
            select(PostReview).where(PostReview.company_id == company_id)
        ).all()
        for pr in post_reviews:
            db.delete(pr)
        
        # 4b. Posts da empresa
        posts = db.exec(
            select(Post).where(Post.company_id == company_id)
        ).all()
        for p in posts:
            db.delete(p)
        
        # 4c. Reviews da empresa
        reviews = db.exec(
            select(Review).where(Review.company_id == company_id)
        ).all()
        for r in reviews:
            db.delete(r)
        
        # 4d. Appointments (têm FK para users e services)
        appointments = db.exec(
            select(Appointment).where(Appointment.company_id == company_id)
        ).all()
        for a in appointments:
            db.delete(a)
        
        # 4e. Working hours
        working_hours = db.exec(
            select(WorkingHour).where(WorkingHour.company_id == company_id)
        ).all()
        for wh in working_hours:
            db.delete(wh)
        
        # 4f. Services
        services = db.exec(
            select(Service).where(Service.company_id == company_id)
        ).all()
        for s in services:
            db.delete(s)
        
        # 4g. Users (funcionarios, clientes, admins)
        users = db.exec(
            select(User).where(User.company_id == company_id)
        ).all()
        for u in users:
            db.delete(u)
        
        # 4h. Finalmente, a empresa
        db.delete(company)
        db.commit()
        
        return {
            "message": f"Empresa #{company_id} e todos os dados vinculados foram excluídos permanentemente.",
            "company_id": company_id,
            "company_name": company.name
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=f"Erro ao excluir empresa: {str(e)}"
        )


@router.get("/companies/lookup")
def lookup_company(subdomain: str, db: Session = Depends(get_session)):
    """O detetive que descobre qual empresa é pelo subdomínio lvh.me"""
    company = db.exec(select(Company).where(Company.subdomain == subdomain)).first()
    
    if not company:
        raise HTTPException(status_code=404, detail="Barbearia não encontrada")
        
    company = sync_company_billing_state(company, db)

    return {
        "id": company.id,
        "name": company.name,
        "subdomain": company.subdomain,
        "logo_url": company.logo_url,
        "address": company.address,  # 🔥 NOVO
        "map_url": company.map_url,  # 🔥 NOVO
        "status": company.status,
        "trial_end": company.trial_end,
        "subscription_end": company.subscription_end,
        "subscription_id": company.subscription_id,
        "asaas_customer_id": company.asaas_customer_id,
    }

@router.get("/companies")
def list_all_companies(session: Session = Depends(get_session)):
    """Lista todas as empresas na tabela do Super Admin."""
    companies = [sync_company_billing_state(company, session) for company in session.exec(select(Company)).all()]
    return [serialize_company_billing(company) for company in companies]

@router.get("/companies/{company_id}/banners")
def get_company_banners(
    company_id: int,
    db: Session = Depends(get_session)
):
    """Rota PÚBLICA que retorna os banners da vitrine ordenados pelo campo order."""
    banners = db.exec(
        select(CompanyBanner)
        .where(CompanyBanner.company_id == company_id)
        .order_by(CompanyBanner.order)
    ).all()
    return banners


@router.get("/companies/{company_id}/products")
def get_public_products(company_id: int, db: Session = Depends(get_session)):
       """Rota PÚBLICA para a vitrine do cliente ver os produtos reais."""
       products = db.exec(
           select(Product).where(Product.company_id == company_id)
       ).all()
       return products
