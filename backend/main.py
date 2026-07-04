from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session, text

# Importa as configurações do banco
from app.core.database import create_db_and_tables, engine
from app.core import models

# Importa TODAS as rotas (incluindo o billing que estava faltando!)
from app.api import (
    auth, feed_routes, users, appointments, 
    admin_routes, services_routes, review_routes, 
    post_review_routes, bot_routes, system_routes, billing_routes,
    products_routes
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Iniciando o servidor e criando tabelas...")
    create_db_and_tables()
    
    with Session(engine) as session:
        try:
            session.exec(text("ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url VARCHAR;"))
            session.exec(text("ALTER TABLE companies ADD COLUMN IF NOT EXISTS asaas_customer_id VARCHAR;"))
            session.exec(text("ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_id VARCHAR;"))
            
            session.exec(text("ALTER TABLE companies ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'TRIAL';"))
            session.exec(text("ALTER TABLE companies ADD COLUMN IF NOT EXISTS trial_end TIMESTAMP;"))
            session.exec(text("ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_end TIMESTAMP;"))
            session.exec(text("ALTER TABLE companies ADD COLUMN IF NOT EXISTS data_cadastro TIMESTAMP;"))
            
            # 👇 A MARRETA: Transforma em texto (::text) só para fazer a busca sem o Postgres encher o saco!
            session.exec(text("UPDATE companies SET status = 'TRIAL' WHERE status::text = 'trial';"))
            session.exec(text("UPDATE companies SET status = 'ACTIVE' WHERE status::text = 'active';"))
            session.exec(text("UPDATE companies SET status = 'SUSPENDED' WHERE status::text = 'suspended';"))
            
            session.exec(
                text(
                    """
                    UPDATE companies
                    SET status = 'TRIAL',
                        trial_end = COALESCE(trial_end, data_cadastro + interval '30 days'),
                        subscription_end = COALESCE(subscription_end, data_cadastro + interval '30 days')
                    WHERE status IS NULL;
                    """
                )
            )
            session.commit()
            print("✅ Colunas da tabela companies sincronizadas e corrigidas com sucesso!")
        except Exception as e:
            session.rollback()
            print(f"⚠️ Aviso na migração: {e}")

    yield
    print("Desligando o servidor...")
    
app = FastAPI(title="Ion System API", lifespan=lifespan)

# Configuração do CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "https://lattech.com.br",
        "https://www.lattech.com.br"
    ],
    # Adicionamos o lattech.com.br no regex para liberar os subdomínios dinâmicos das barbearias e do painel!
    allow_origin_regex=r"https?://([a-zA-Z0-9-]+\.)?(lvh\.me|lattech\.com\.br)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Servidor de arquivos estáticos (Uploads)
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# 🔥 AQUI ESTÁ A CORREÇÃO: TODAS AS ROTAS PLUGADAS 🔥
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(appointments.router)
app.include_router(feed_routes.router)
app.include_router(admin_routes.router)
app.include_router(services_routes.router)
app.include_router(review_routes.router)
app.include_router(post_review_routes.router)
app.include_router(bot_routes.router)
app.include_router(system_routes.router)
app.include_router(billing_routes.router) # O botão do SuperAdmin agora funciona!
app.include_router(products_routes.router) # Vitrine de Produtos (pública)

@app.get("/")
async def root():
    return {"message": "Ion System API rodando 100%!"}