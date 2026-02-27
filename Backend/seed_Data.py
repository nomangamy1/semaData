from semaData import semaData_app, db
from models import User, DomainOwner
from models import Domain, JobApplication 

app = semaData_app()

with app.app_context():
    # 1. Create the Domain Owner
    owner = DomainOwner(
        email='muthoniRency@gmail.com',
        first_name='Muthoni',
        last_name='Rency',
        user_type='owner',
        password_hash='dummy_hash' # In a real scenario, use werkzeug.security
    )
    db.session.add(owner)
    db.session.flush() # Gets the owner.id

    # 2. Create the Domain
    new_domain = Domain(
        reference_number='AGRI--LU2NMD',
        domain_name='AgriTest',
        owner_id=owner.id,
        is_active=True
    )
    db.session.add(new_domain)

    # 3. Create the Approved Application
    app_record = JobApplication(
        email='muthoniRency@gmail.com',
        reference_number_assigned='AGRI--LU2NMD',
        status='approved',
        applicant_id=owner.id # or a specific applicant ID
    )
    db.session.add(app_record)

    try:
        db.session.commit()
        print("✅ Success! Data seeded. You can now proceed with the registration.")
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error seeding data: {e}")