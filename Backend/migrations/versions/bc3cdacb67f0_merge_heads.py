"""merge heads

Revision ID: bc3cdacb67f0
Revises: 92c29bbafdfd, contact_001
Create Date: 2026-02-22 11:36:26.865710

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'bc3cdacb67f0'
down_revision = ('92c29bbafdfd', 'contact_001')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
