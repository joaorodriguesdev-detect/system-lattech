from sqlmodel import SQLModel
from app.core.database import engine
from app.models import * # Importa o Product e todos os outros modelos

print("A analisar a base de dados...")
SQLModel.metadata.create_all(engine)
print("Tabelas criadas com sucesso! A vitrine está pronta.")