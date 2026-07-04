from sqlmodel import create_engine, SQLModel, Session

# A URL deve apontar para o container do Postgres que rodamos no Docker
# Lembre-se: 'db' é o nome do serviço que definimos no docker-compose.yml
DATABASE_URL = "postgresql://user:password@db:5432/ionbarber"

# PostgreSQL não precisa do 'check_same_thread', então removemos o connect_args
engine = create_engine(DATABASE_URL, echo=True)

def create_db_and_tables():
    """Função para criar as tabelas no PostgreSQL automaticamente"""
    SQLModel.metadata.create_all(engine)

def get_session():
    """Dependency injection para fornecer a sessão do banco para as rotas do FastAPI"""
    with Session(engine) as session:
        yield session