"""
Rota pública da Vitrine de Produtos.

Exibe os produtos ativos de uma empresa (barbearia) sem necessidade de autenticação.
Usado pelo carrossel de produtos na página principal.
"""

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select
from app.core.database import get_session
from app.models import Product

router = APIRouter(prefix="/products", tags=["Products (Vitrine)"])


@router.get("/")
def list_public_products(
    company_id: int = Query(..., description="ID da empresa para filtrar os produtos"),
    session: Session = Depends(get_session),
):
    """
    Retorna os produtos ATIVOS da vitrine de uma empresa.
    Rota pública — não exige token de autenticação.
    """
    products = session.exec(
        select(Product).where(
            Product.company_id == company_id,
            Product.active == True,
        )
    ).all()

    # Serializa para dict (evita problemas com datas)
    return [
        {
            "id": p.id,
            "name": p.name,
            "price": float(p.price),
            "description": p.description or "",
            "tag": p.tag or "",
            "image_url": p.image_url or "",
            "active": p.active,
        }
        for p in products
    ]
