
"""Add ContactInquiry model

Revision ID: contact_001
Revises: 
Create Date: 2026-02-22 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# Alembic revision identifiers
revision = 'contact_001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade(): 
	"""Apply migration: create ContactInquiry table placeholder.
	This migration currently provides metadata so Alembic can detect it.
	Replace or extend with actual schema changes as needed.
	"""
	pass


def downgrade():
	"""Revert migration."""
	pass

