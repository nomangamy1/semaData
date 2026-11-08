"""Add structured definitions to domain features.

Revision ID: 2d9c7a4e1f63
Revises: 1a530777c556
Create Date: 2026-11-08
"""
from alembic import op
import sqlalchemy as sa


revision = '2d9c7a4e1f63'
down_revision = '1a530777c556'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('domain_features', sa.Column('definition', sa.JSON(), nullable=True))


def downgrade():
    op.drop_column('domain_features', 'definition')
