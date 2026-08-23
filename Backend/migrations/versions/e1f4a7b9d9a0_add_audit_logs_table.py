"""add audit logs table

Revision ID: e1f4a7b9d9a0
Revises: cfd5d4e5c7b1
Create Date: 2026-08-23 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'e1f4a7b9d9a0'
down_revision = 'cfd5d4e5c7b1'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.Integer(), primary_key=True),
        # actor_id intentionally created without FK to avoid case-sensitive table name issues
        sa.Column('actor_id', sa.Integer(), nullable=True),
        sa.Column('action', sa.String(length=120), nullable=False),
        sa.Column('target_table', sa.String(length=120), nullable=True),
        sa.Column('target_id', sa.String(length=120), nullable=True),
        sa.Column('before', sa.JSON(), nullable=True),
        sa.Column('after', sa.JSON(), nullable=True),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    )


def downgrade():
    op.drop_table('audit_logs')
