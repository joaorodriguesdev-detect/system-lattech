# backend/app/models.py
from datetime import datetime, time, timezone
from enum import Enum
from typing import List, Optional
from sqlmodel import Field, Relationship, SQLModel

# ----------------------------------------------------------------
# ENUMS
# ----------------------------------------------------------------
class UserRole(str, Enum):
    ADMIN = "admin"
    BARBER = "barber"
    CUSTOMER = "customer"

class AppointmentStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELED = "canceled"

class ServiceType(str, Enum):
    CABELO = "Cabelo"
    BARBA = "Barba"
    LUZES = "Luzes"
    HIDRATACAO = "Hidratação"
    SOBRANCELHA = "Sobrancelha"
    COMBO_CABELO_BARBA = "Cabelo + Barba"
    COMBO_COMPLETO = "Completo (Cabelo + Barba + Sobrancelha)"
class TenantStatus(str, Enum):
    TRIAL = "trial"
    ACTIVE = "active"
    SUSPENDED = "suspended"

# ----------------------------------------------------------------
# TABELAS / MODELOS (Multi-tenant)
# ----------------------------------------------------------------

class Company(SQLModel, table=True):
    __tablename__ = "companies"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    subdomain: str = Field(unique=True, index=True) 
    data_cadastro: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = Field(default=True)
    logo_url: Optional[str] = Field(default=None)
    
    # 🔥 CAMPOS NOVOS ADICIONADOS AQUI:
    address: Optional[str] = Field(default=None)
    map_url: Optional[str] = Field(default=None)
    
    asaas_customer_id: Optional[str] = Field(default=None, index=True)
    subscription_id: Optional[str] = Field(default=None, index=True)
    status: TenantStatus = Field(default=TenantStatus.TRIAL, index=True)
    trial_end: Optional[datetime] = Field(default=None)
    subscription_end: Optional[datetime] = Field(default=None)

class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="companies.id")
    name: str = Field(index=True)
    email: str = Field(unique=True, index=True)
    phone: Optional[str] = Field(default=None)
    hashed_password: str
    role: UserRole = Field(default=UserRole.CUSTOMER)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # 🔥 CAMPO ADICIONADO PARA SALVAR A COMISSÃO FIXA
    commission_value: float = Field(default=0.0)

    barber_appointments: List["Appointment"] = Relationship(
        back_populates="barber",
        sa_relationship_kwargs={"foreign_keys": "Appointment.barber_id"}
    )
    
    # 🔥 RELAÇÃO DO CLIENTE CORRIGIDA AQUI:
    customer_appointments: List["Appointment"] = Relationship(
        back_populates="customer",
        sa_relationship_kwargs={"foreign_keys": "Appointment.customer_id"}
    )
    
    working_hours: List["WorkingHour"] = Relationship(back_populates="barber")

class Post(SQLModel, table=True):
    __tablename__ = "posts"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="companies.id")
    barber_id: int = Field(foreign_key="users.id")
    image_url: str
    caption: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    reviews: List["PostReview"] = Relationship(back_populates="post")

class PostReviewStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class PostReview(SQLModel, table=True):
    __tablename__ = "post_reviews"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="companies.id")
    post_id: int = Field(foreign_key="posts.id")
    customer_name: str = Field(max_length=100, default="Anônimo")
    rating: int = Field(description="Nota de 1 a 5 estrelas")
    status: PostReviewStatus = Field(default=PostReviewStatus.PENDING)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    approved_at: Optional[datetime] = Field(default=None)
    
    post: Post = Relationship(back_populates="reviews")

class Service(SQLModel, table=True):
    __tablename__ = "services"

    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="companies.id")
    name: str = Field(index=True)
    description: Optional[str] = Field(default=None)
    price: float
    duration_minutes: int
    is_active: bool = Field(default=True)

    appointments: List["Appointment"] = Relationship(back_populates="service")

class WorkingHour(SQLModel, table=True):
    __tablename__ = "working_hours"

    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="companies.id")
    barber_id: int = Field(foreign_key="users.id")
    day_of_week: int = Field(description="0=Segunda, 6=Domingo")
    start_time: time
    end_time: time
    is_available: bool = Field(default=True)

    barber: User = Relationship(back_populates="working_hours")

class Appointment(SQLModel, table=True):
    __tablename__ = "appointments"

    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="companies.id")
    customer_id: int = Field(foreign_key="users.id")
    barber_id: int = Field(foreign_key="users.id")
    service_id: int = Field(foreign_key="services.id")

    appointment_date: datetime = Field(index=True)
    status: AppointmentStatus = Field(default=AppointmentStatus.PENDING)
    notes: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    barber: User = Relationship(
        back_populates="barber_appointments",
        sa_relationship_kwargs={"foreign_keys": "Appointment.barber_id"}
    )
    customer: User = Relationship(
        back_populates="customer_appointments",
        sa_relationship_kwargs={"foreign_keys": "Appointment.customer_id"}
    )
    service: Service = Relationship(back_populates="appointments")

# ----------------------------------------------------------------
# SCHEMAS DE VALIDAÇÃO
# ----------------------------------------------------------------

class PostCreate(SQLModel):
    barber_id: int
    image_url: str
    caption: Optional[str] = None

class UserCreate(SQLModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = None
    role: Optional[UserRole] = UserRole.CUSTOMER

class CompanyCreate(SQLModel):
    company_name: str
    subdomain: str
    admin_name: str
    admin_email: str
    admin_password: str

# ----------------------------------------------------------------
# MODELO REVIEW (Corrigido)
# ----------------------------------------------------------------

class ReviewStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class Review(SQLModel, table=True):
    __tablename__ = "reviews"

    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="companies.id")
    customer_name: str = Field(max_length=100)
    rating: int = Field(description="Nota de 1 a 5 estrelas")
    comment: str = Field(max_length=50, description="Texto da avaliação")
    status: ReviewStatus = Field(default=ReviewStatus.PENDING)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    approved_at: Optional[datetime] = Field(default=None)

class CompanyBanner(SQLModel, table=True):
    __tablename__ = "company_banners"

    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="companies.id", index=True)
    image_url: str
    order: int = Field(description="Ordem de 1 a 5 no carrossel")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Product(SQLModel, table=True):
    __tablename__ = "products"
    
    id: int | None = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="companies.id", index=True)
    
    name: str
    price: float
    description: str | None = None
    tag: str | None = None
    image_url: str | None = None
    active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))