"""Add persistent domain-owner drafts.

Revision ID: 4c3a9d2b7e11
Revises: 2d9c7a4e1f63
Create Date: 2026-11-08
"""
from alembic import op
import sqlalchemy as sa


revision = "4c3a9d2b7e11"
down_revision = "2d9c7a4e1f63"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "domain_drafts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "owner_id",
            sa.Integer(),
            sa.ForeignKey("DomainOwner.id"),
            nullable=False,
        ),
        sa.Column("domain_name", sa.String(length=128), nullable=False, server_default=""),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index(
        "ix_domain_drafts_owner_id",
        "domain_drafts",
        ["owner_id"],
    )


def downgrade():
    op.drop_index("ix_domain_drafts_owner_id", table_name="domain_drafts")
    op.drop_table("domain_drafts")
