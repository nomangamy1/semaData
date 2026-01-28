import pytest
from Backend.semaData import semaData_app
from Backend.extensions import db
from Backend.models import Domain, User, Dataset

@pytest.fixture(scope='session')
def app():
    # Use a specific 'testing' config with an in-memory SQLite DB
    app = semaData_app('testing') 
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()

@pytest.fixture(scope='function')
def session(app):
    """Creates a new database session for a test."""
    with app.app_context():
        yield db.session
        db.session.rollback() # Roll back changes so tests stay isolated