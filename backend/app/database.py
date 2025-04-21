from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# URL database MySQL
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://root:root@localhost:3306/chatbot"

# Buat engine
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Buat session local
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base untuk model
Base = declarative_base()

# Fungsi untuk mendapatkan session database
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 