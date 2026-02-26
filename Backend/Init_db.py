from semaData import semaData_app, db
# Import your models here so SQLAlchemy knows they exist
from models import User, DomainOwner 
app =semaData_app()
with semaData_app.app_context():
    db.create_all()
    print("Database tables created successfully!")