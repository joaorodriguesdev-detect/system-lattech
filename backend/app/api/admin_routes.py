import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException, UploadFile, File
from sqlmodel import Session, select, func
from pydantic import BaseModel

from app.core.database import get_session
from app.core.security import get_current_admin_user
from app.models import Appointment, AppointmentStatus, Service, User, Review, UserRole, ReviewStatus, Company, TenantStatus, Product, CompanyBanner
from app.services.billing_service import sync_company_billing_state

# 🔥 AQUI ESTÁ O IMPORT DO NOSSO SERVIÇO DE NUVEM
from app.services import storage_service

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/dashboard")
def get_dashboard_metrics(
    admin: User = Depends(get_current_admin_user),
    session: Session = Depends(get_session),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
):
    company_id = admin.company_id
    today = date.today()

    if not end_date:
        end_date = today + timedelta(days=365)
    if not start_date:
        start_date = today - timedelta(days=30)

    start_dt = datetime.combine(start_date, datetime.min.time())
    end_dt = datetime.combine(end_date, datetime.max.time())

    total_appointments = session.exec(
        select(func.count(Appointment.id)).where(
            Appointment.company_id == company_id,
            Appointment.appointment_date >= start_dt,
            Appointment.appointment_date <= end_dt,
        )
    ).first() or 0

    completed_count = session.exec(
        select(func.count(Appointment.id)).where(
            Appointment.company_id == company_id,
            Appointment.status == AppointmentStatus.COMPLETED,
            Appointment.appointment_date >= start_dt,
            Appointment.appointment_date <= end_dt,
        )
    ).first() or 0

    canceled_count = session.exec(
        select(func.count(Appointment.id)).where(
            Appointment.company_id == company_id,
            Appointment.status == AppointmentStatus.CANCELED,
            Appointment.appointment_date >= start_dt,
            Appointment.appointment_date <= end_dt,
        )
    ).first() or 0

    pending_count = session.exec(
        select(func.count(Appointment.id)).where(
            Appointment.company_id == company_id,
            Appointment.status == AppointmentStatus.PENDING,
            Appointment.appointment_date >= start_dt,
            Appointment.appointment_date <= end_dt,
        )
    ).first() or 0

    revenue_result = session.exec(
        select(func.sum(Service.price))
        .join(Appointment, Appointment.service_id == Service.id)
        .where(
            Appointment.company_id == company_id,
            Appointment.status == AppointmentStatus.COMPLETED,
            Appointment.appointment_date >= start_dt,
            Appointment.appointment_date <= end_dt,
        )
    ).first()
    
    revenue = round(float(revenue_result or 0.0), 2)

    total_barbers = session.exec(
        select(func.count(User.id)).where(
            User.company_id == company_id,
            User.role.in_([UserRole.ADMIN, UserRole.BARBER])
        )
    ).first() or 1

    pending_reviews = session.exec(
        select(func.count(Review.id)).where(
            Review.company_id == company_id,
            Review.status == ReviewStatus.PENDING,
        )
    ).first() or 0

    top_services_rows = session.exec(
        select(
            Service.name,
            Service.price,
            func.count(Appointment.id).label("count"),
        )
        .join(Appointment, Appointment.service_id == Service.id)
        .where(
            Appointment.company_id == company_id,
            Appointment.appointment_date >= start_dt,
            Appointment.appointment_date <= end_dt,
        )
        .group_by(Service.id, Service.name, Service.price)
        .order_by(func.count(Appointment.id).desc())
        .limit(3)
    ).all()

    top_services = []
    for row in top_services_rows:
        name = row.name.value if hasattr(row.name, "value") else str(row.name)
        top_services.append(
            {
                "name": name,
                "price": float(row.price),
                "count": row.count,
            }
        )

    return {
        "period": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
        },
        "total_appointments": total_appointments,
        "completed_appointments": completed_count,
        "canceled_appointments": canceled_count,
        "pending_appointments": pending_count,
        "revenue": revenue,
        "total_barbers": total_barbers,
        "total_attendances": completed_count, 
        "top_services": top_services,
        "pending_reviews": pending_reviews,
    }


# ==========================================
# ROTA DE AGENDAMENTOS DO DIA (NOVO)
# ==========================================
class DailyAppointmentResponse(BaseModel):
    id: int
    customer_name: str
    service_name: str
    barber_name: str
    time: str
    status: str

@router.get("/dashboard/daily-appointments", response_model=List[DailyAppointmentResponse])
def get_daily_appointments(
    admin: User = Depends(get_current_admin_user),
    session: Session = Depends(get_session)
):
    """Busca a agenda completa (00:00 às 23:59) do dia atual para a empresa logada."""
    hoje = date.today()
    start_dt = datetime.combine(hoje, datetime.min.time())
    end_dt = datetime.combine(hoje, datetime.max.time())

    # Realizando JOIN para obter os nomes do serviço e do barbeiro sem consultas extras
    results = session.exec(
        select(Appointment, Service.name, User.name)
        .join(Service, Appointment.service_id == Service.id, isouter=True)
        .join(User, Appointment.barber_id == User.id, isouter=True)
        .where(
            Appointment.company_id == admin.company_id,
            Appointment.appointment_date >= start_dt,
            Appointment.appointment_date <= end_dt
        )
        .order_by(Appointment.appointment_date.asc())
    ).all()

    daily_list = []
    for appt, svc_name, barber_name in results:
        # Pega a hora formatada
        time_str = appt.appointment_date.strftime("%H:%M") if appt.appointment_date else "00:00"
        
        # Converte Enums se necessário
        status_str = appt.status.value if hasattr(appt.status, 'value') else str(appt.status)

        daily_list.append(DailyAppointmentResponse(
            id=appt.id,
            customer_name=appt.customer_name or "Cliente Padrão",
            service_name=svc_name or "Serviço",
            barber_name=barber_name or "Barbeiro",
            time=time_str,
            status=status_str
        ))
        
    return daily_list


# ==========================================
# ROTAS DA EQUIPE (FUNCIONÁRIOS)
# ==========================================

class BarberCreate(BaseModel):
    name: str
    phone: str
    commission_value: float = 0.0

class AssignBarberUpdate(BaseModel):
    barber_id: int

@router.post("/barbers")
def create_barber(
    data: BarberCreate,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    unique_ghost_email = f"barber_{uuid.uuid4().hex[:8]}@empresa{admin.company_id}.sistema.com"

    new_barber = User(
        name=data.name,
        email=unique_ghost_email,
        phone=data.phone,
        role=UserRole.BARBER,
        company_id=admin.company_id,
        commission_value=data.commission_value,
        hashed_password="none"
    )

    try:
        session.add(new_barber)
        session.commit()
        session.refresh(new_barber)
        return new_barber
    except Exception as e:
        session.rollback()
        raise HTTPException(400, f"Erro do Banco de Dados: {str(e)}")

@router.get("/barbers")
def list_barbers(
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    users = session.exec(
        select(User).where(
            User.company_id == admin.company_id,
            User.role.in_([UserRole.ADMIN, UserRole.BARBER])
        )
    ).all()
    return users

@router.patch("/appointments/{appointment_id}/assign")
def assign_barber_route(
    appointment_id: int,
    data: AssignBarberUpdate,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    appointment = session.get(Appointment, appointment_id)
    if not appointment or appointment.company_id != admin.company_id:
        raise HTTPException(404, "Agendamento não encontrado")
    
    appointment.barber_id = data.barber_id
    session.add(appointment)
    session.commit()
    session.refresh(appointment)
    return appointment

# ==========================================
# ROTA DE UPLOAD DE LOGO (SUPABASE)
# ==========================================

@router.post("/company/logo")
async def update_company_logo(
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    try:
        company = session.get(Company, admin.company_id)
        if not company:
            raise HTTPException(404, "Empresa não encontrada.")

        # 1. Lê os bytes e gera um nome único
        file_bytes = await file.read()
        file_extension = file.filename.split('.')[-1]
        file_path = f"empresa_{company.id}_{uuid.uuid4().hex}.{file_extension}"
        
        # 2. Sobe para o Supabase Storage (Bucket: 'logos')
        public_url = storage_service.upload_logo(file_bytes, file_path, file.content_type)
        
        # 3. Atualiza o cadastro da empresa no PostgreSQL
        company.logo_url = public_url
        session.add(company)
        session.commit()
        session.refresh(company)
        
        return {"ok": True, "logo_url": public_url, "message": "Logo atualizada com sucesso no Supabase"}
        
    except Exception as e:
        session.rollback()
        print(f"[ERRO LOGO SUPABASE] {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao salvar a logo.")

# ==========================================
# ROTA DO PLANO / LICENÇA E INFORMAÇÕES DA EMPRESA
# ==========================================

@router.get("/company")
def get_company_info(
    admin: User = Depends(get_current_admin_user),
    session: Session = Depends(get_session),
):
    company = session.get(Company, admin.company_id)
    if not company:
        raise HTTPException(404, "Empresa não encontrada.")

    company = sync_company_billing_state(company, session)

    now = datetime.now(timezone.utc)

    def _aware(dt):
        if dt is None:
            return None
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)

    dias_restantes = 0
    if company.status == TenantStatus.TRIAL:
        trial_end = _aware(company.trial_end)
        if trial_end:
            dias_restantes = max(0, (trial_end - now).days)
    elif company.status == TenantStatus.ACTIVE:
        sub_end = _aware(company.subscription_end)
        if sub_end:
            dias_restantes = max(0, (sub_end - now).days)

    return {
        "status": company.status.value if hasattr(company.status, 'value') else company.status,
        "trial_end": company.trial_end,
        "subscription_end": company.subscription_end,
        "dias_restantes": dias_restantes,
        "address": company.address,
        "map_url": company.map_url,
        "data_cadastro": company.data_cadastro,
        "logo_url": company.logo_url, 
        "whatsapp_number": company.whatsapp_number, 
    }

# ==========================================
# ROTAS DA VITRINE DE PRODUTOS
# ==========================================
from fastapi import Form
from typing import Optional

@router.post("/products")
async def create_product(
    name: str = Form(...),
    price: float = Form(...),
    description: Optional[str] = Form(None),
    tag: Optional[str] = Form(None),
    image: UploadFile = File(...),
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    try:
        # Pega a foto, extrai os bytes e manda para o Supabase
        file_bytes = await image.read()
        ext = image.filename.split('.')[-1]
        file_path = f"produto_{admin.company_id}_{uuid.uuid4().hex}.{ext}"
        
        public_url = storage_service.upload_product(file_bytes, file_path, image.content_type)
        
        # Salva as informações do produto no banco de dados
        new_product = Product(
            company_id=admin.company_id,
            name=name,
            price=price,
            description=description,
            tag=tag,
            image_url=public_url
        )
        session.add(new_product)
        session.commit()
        session.refresh(new_product)
        return new_product
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/products")
def list_products(
    session: Session = Depends(get_session), 
    admin: User = Depends(get_current_admin_user)
):
    return session.exec(select(Product).where(Product.company_id == admin.company_id)).all()

@router.delete("/products/{product_id}")
def delete_product(
    product_id: int, 
    session: Session = Depends(get_session), 
    admin: User = Depends(get_current_admin_user)
):
    product = session.get(Product, product_id)
    if not product or product.company_id != admin.company_id:
        raise HTTPException(404, "Produto não encontrado")
    
    # Exclui a imagem do Supabase primeiro
    if product.image_url and "products/" in product.image_url:
        path = product.image_url.split("products/")[-1]
        storage_service.delete_product_image(path)
        
    # Depois exclui do banco de dados
    session.delete(product)
    session.commit()
    return {"ok": True, "message": "Produto excluído."}

# ==========================================
# ROTAS DE BANNERS DA VITRINE
# ==========================================

@router.get("/company/banners")
def list_company_banners(
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    """Retorna todos os banners da empresa ordenados pelo campo order."""
    banners = session.exec(
        select(CompanyBanner)
        .where(CompanyBanner.company_id == admin.company_id)
        .order_by(CompanyBanner.order)
    ).all()
    return banners

@router.post("/company/banners")
async def upload_company_banner(
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    """
    Faz upload de uma imagem de banner para a vitrine da empresa.
    Máximo de 5 banners por empresa.
    """
    try:
        company_id = admin.company_id

        # 1. Verifica quantos banners já existem
        existing_count = session.exec(
            select(func.count(CompanyBanner.id)).where(
                CompanyBanner.company_id == company_id
            )
        ).first() or 0

        if existing_count >= 5:
            raise HTTPException(
                status_code=400,
                detail="Limite máximo de 5 banners atingido. Remova um banner antes de adicionar outro."
            )

        # 2. Lê o arquivo e faz upload para o Supabase
        file_bytes = await file.read()
        file_path = f"{company_id}/{file.filename}"
        public_url = storage_service.upload_banner(file_bytes, file_path, file.content_type)

        # 3. Define a ordem (próximo número disponível)
        next_order = existing_count + 1

        # 4. Salva no banco
        new_banner = CompanyBanner(
            company_id=company_id,
            image_url=public_url,
            order=next_order,
        )
        session.add(new_banner)
        session.commit()
        session.refresh(new_banner)

        return {"ok": True, "banner": new_banner}

    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        print(f"[ERRO BANNER UPLOAD] {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao fazer upload do banner.")


@router.delete("/company/banners/{banner_id}")
def delete_company_banner(
    banner_id: int,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    """Remove um banner da vitrine (Supabase + banco de dados)."""
    banner = session.get(CompanyBanner, banner_id)

    if not banner or banner.company_id != admin.company_id:
        raise HTTPException(404, "Banner não encontrado.")

    try:
        # 1. Deleta a imagem do Supabase
        if "banners/" in banner.image_url:
            path = banner.image_url.split("banners/")[-1]
            storage_service.delete_banner(path)

        # 2. Deleta o registro do banco
        session.delete(banner)
        session.commit()

        # 3. Reordena os banners restantes para manter sequência 1..N
        remaining = session.exec(
            select(CompanyBanner)
            .where(CompanyBanner.company_id == admin.company_id)
            .order_by(CompanyBanner.order)
        ).all()

        for i, b in enumerate(remaining, start=1):
            b.order = i
            session.add(b)

        session.commit()

        return {"ok": True, "message": "Banner removido com sucesso."}

    except Exception as e:
        session.rollback()
        print(f"[ERRO BANNER DELETE] {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao remover banner.")


# ==========================================
# ROTA DE COMISSÃO FIXA (VALOR POR CORTE)
# ==========================================

class BarberCommissionUpdate(BaseModel):
    commission_value: float

@router.patch("/barbers/{barber_id}/commission")
def update_barber_commission(
    barber_id: int,
    data: BarberCommissionUpdate,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    barber = session.exec(
        select(User).where(User.id == barber_id, User.company_id == admin.company_id)
    ).first()
    if not barber:
        raise HTTPException(404, "Profissional não encontrado")
    
    barber.commission_value = data.commission_value
    session.add(barber)
    session.commit()
    session.refresh(barber)
    return {"ok": True, "commission_value": barber.commission_value}

# ==========================================
# ROTA DE LOCALIZAÇÃO E CONTATO (MAPA + WHATSAPP)
# ==========================================
class CompanyLocationUpdate(BaseModel):
    address: str | None = None
    map_url: str | None = None
    whatsapp_number: str | None = None # 🔥 CAMPO ADICIONADO AQUI!

@router.put("/company/location")
def update_company_location(
    data: CompanyLocationUpdate,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    company = session.get(Company, admin.company_id)
    if not company:
        raise HTTPException(404, "Empresa não encontrada.")
    
    company.address = data.address
    company.map_url = data.map_url
    
    # 🔥 Salvando o número no banco de dados!
    if data.whatsapp_number is not None:
        # Aqui podemos aplicar uma limpeza (opcional) para garantir que só salve números
        clean_number = "".join(c for c in data.whatsapp_number if c.isdigit())
        company.whatsapp_number = clean_number
    
    session.add(company)
    session.commit()
    return {"ok": True, "message": "Localização e contato atualizados com sucesso!"}