"""Add persistent admin messages for domain owners.

Revision ID: 8a1b6c4d2e90
Revises: 4c3a9d2b7e11
Create Date: 2026-11-08
"""
from alembic import op
import sqlalchemy as sa


revision = "8a1b6c4d2e90"
down_revision = "4c3a9d2b7e11"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "domain_owner_notifications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("domain_id", sa.Integer(), sa.ForeignKey("domain.id"), nullable=False),
        sa.Column("owner_id", sa.Integer(), sa.ForeignKey("DomainOwner.id"), nullable=False),
        sa.Column("sender_admin_id", sa.Integer(), sa.ForeignKey("Users.id"), nullable=False),
        sa.Column("sender_name", sa.String(length=100), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("read_at", sa.DateTime(), nullable=True),
    )
    op.create_index(
        "ix_domain_owner_notifications_domain_id",
        "domain_owner_notifications",
        ["domain_id"],
    )
    op.create_index(
        "ix_domain_owner_notifications_owner_id",
        "domain_owner_notifications",
        ["owner_id"],
    )
    op.create_index(
        "ix_domain_owner_notifications_created_at",
        "domain_owner_notifications",
        ["created_at"],
    )


def downgrade():
    op.drop_index("ix_domain_owner_notifications_created_at", table_name="domain_owner_notifications")
    op.drop_index("ix_domain_owner_notifications_owner_id", table_name="domain_owner_notifications")
    op.drop_index("ix_domain_owner_notifications_domain_id", table_name="domain_owner_notifications")
    op.drop_table("domain_owner_notifications")
