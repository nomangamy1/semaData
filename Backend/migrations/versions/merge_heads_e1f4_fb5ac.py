"""merge heads e1f4 + fb5ac

Revision ID: merge_e1f4_fb5ac
Revises: e1f4a7b9d9a0, fb5accc5833a
Create Date: 2026-08-23 00:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'merge_e1f4_fb5ac'
down_revision = ('e1f4a7b9d9a0', 'fb5accc5833a')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
