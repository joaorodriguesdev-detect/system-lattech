import os
from sqlmodel import create_engine, SQLModel, Session

# 🔥 Busca a URL do banco do arquivo .env. Nunca mais ficará exposta no código!
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@db:5432/ionbarber")

# Em produção, recomenda-se echo=False para não vazar logs de queries SQL
engine = create_engine(DATABASE_URL, echo=False)

def create_db_and_tables():
    """Função para criar as tabelas no PostgreSQL automaticamente"""
    SQLModel.metadata.create_all(engine)

def get_session():
    """Dependency injection para fornecer a sessão do banco para as rotas do FastAPI"""
    with Session(engine) as session:
        yield session