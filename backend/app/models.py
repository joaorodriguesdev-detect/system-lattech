from datetime import datetime, timezone
"""
Re-exporta todos os modelos e enums de app.core.models.
Este arquivo permite que os services e routes importem de 'app.models'
em vez de 'app.core.models', conforme as regras de clean code do projeto.

ATENÇÃO: TODOS os modelos ficam em app/core/models.py!
Não defina classes SQLModel com table=True neste arquivo,
pois causaria conflito de tabelas duplicadas no MetaData do SQLAlchemy.
"""

from app.core.models import (
    # Enums
    UserRole,
    AppointmentStatus,
    ServiceType,
    TenantStatus,
    PostReviewStatus,
    ReviewStatus,
    # Tabelas / Modelos
    Company,
    User,
    Post,
    PostReview,
    Service,
    WorkingHour,
    Appointment,
    Review,
    Product,
    CompanyBanner,
    PushSubscription,
    # Schemas de validação
    PostCreate,
    UserCreate,
    CompanyCreate,
)

__all__ = [
    "UserRole",
    "AppointmentStatus",
    "ServiceType",
    "TenantStatus",
    "PostReviewStatus",
    "ReviewStatus",
    "Company",
    "User",
    "Post",
    "PostReview",
    "Service",
    "WorkingHour",
    "Appointment",
    "Review",
    "Product",
    "CompanyBanner",
    "PushSubscription",
    "PostCreate",
    "UserCreate",
    "CompanyCreate",
]