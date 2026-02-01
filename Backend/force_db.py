from semaData import semaData_app
from extensions import db
import os

app = semaData_app()
with app.app_context():
    # Use a totally different filename with NO folders
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///sema_final_test.db'
    
    print(f"Attempting to create: {os.getcwd()}/sema_final_test.db")
    
    try:
        db.create_all()
        print("✅ SUCCESS! Tables created in sema_final_test.db")
    except Exception as e:
        print(f"❌ Still Failed: {e}")