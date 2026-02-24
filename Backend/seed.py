from semaData import semaData_app
from extensions import db
from models.user import User
from werkzeug.security import generate_password_hash

app = semaData_app()

def seed_admin():
    with app.app_context():
        print("Checking for existing Admin...")
        admin_exists = User.query.filter_by(role='admin').first()

        if not admin_exists:
            print("No Admin found. Creating production admin account...")
            
            new_admin = User(
                id=1010, 
                user_type='admin',
                first_name='Norman',
                second_name='Gamy',
                email='admin@semadata.com',
                is_verified=True,
                role='admin',
                # Mapping directly to your column name:
                password_hash=generate_password_hash("4upm6Z?!"),
                # reference_number is left as None because admins don't belong to a domain
                domain_name='SemaData Central' 
            )
            
            db.session.add(new_admin)
            db.session.commit()
            print("✨ Successfully created Admin with ID 1010!")
        else:
            print(f"Admin already exists: {admin_exists.email}")

if __name__ == "__main__":
    seed_admin()