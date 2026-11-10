import os
from getpass import getpass
from urllib.parse import urlparse

from sqlalchemy import inspect
from sqlalchemy.exc import IntegrityError, SQLAlchemyError


def main():
    if os.environ.get("FLASK_ENV") != "testing":
        raise SystemExit("Set FLASK_ENV=testing to target the test database.")

    database_uri = os.environ.get("TEST_DATABASE_URI", "")
    hostname = urlparse(database_uri).hostname or ""
    if not database_uri or not hostname.endswith(".neon.tech"):
        raise SystemExit("Set TEST_DATABASE_URI to the Neon test-branch connection string.")

    if input("Confirm this connection points to the Neon TEST branch (type TEST): ").strip() != "TEST":
        raise SystemExit("Aborted; no admin account was created.")

    email = input("New admin email: ").strip().lower()
    if not email or "@" not in email:
        raise SystemExit("Enter a valid email address.")

    password = getpass("New admin password (minimum 14 characters): ")
    if len(password) < 14:
        raise SystemExit("Use a password of at least 14 characters.")
    if password != getpass("Confirm new admin password: "):
        raise SystemExit("Passwords do not match.")

    from extensions import db
    from models.user import User
    from semaData import semaData_app

    app = semaData_app()
    with app.app_context():
        inspector = inspect(db.engine)
        if "Users" not in inspector.get_table_names():
            raise SystemExit('The "Users" table is missing. Run the migrations first.')
        columns = {column["name"] for column in inspector.get_columns("Users")}
        if "is_super_admin" not in columns:
            raise SystemExit('The "Users" table is outdated. Run the migrations first.')

        if User.query.filter_by(email=email).first():
            raise SystemExit("That email already exists. No account was changed.")

        admin = User(
            user_type="admin",
            role="admin",
            email=email,
            is_verified=True,
            is_super_admin=True,
        )
        admin.set_password(password)
        db.session.add(admin)

        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            raise SystemExit("The account could not be created; check for an existing email.")
        except SQLAlchemyError as exc:
            db.session.rollback()
            raise SystemExit(
                f"Database error ({type(exc).__name__}); no admin account was created."
            ) from None

    print(f"Admin account created for {email}.")


if __name__ == "__main__":
    main()
