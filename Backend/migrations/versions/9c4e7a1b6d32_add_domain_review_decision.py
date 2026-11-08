"""Add an admin review decision separate from payment status.

Revision ID: 9c4e7a1b6d32
Revises: 8a1b6c4d2e90
Create Date: 2026-11-08
"""
from alembic import op
import sqlalchemy as sa


revision = "9c4e7a1b6d32"
down_revision = "8a1b6c4d2e90"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "domain",
        sa.Column("review_status", sa.String(length=20), nullable=False, server_default="pending"),
    )
    op.add_column(
        "domain",
        sa.Column("reviewed_by_user_id", sa.Integer(), nullable=True),
    )
    op.add_column(
        "domain",
        sa.Column("reviewed_at", sa.DateTime(), nullable=True),
    )
    op.create_foreign_key(
        "fk_domain_reviewed_by_user_id_users",
        "domain",
        "Users",
        ["reviewed_by_user_id"],
        ["id"],
    )
    op.alter_column("domain", "review_status", server_default=None)


def downgrade():
    op.drop_constraint("fk_domain_reviewed_by_user_id_users", "domain", type_="foreignkey")
    op.drop_column("domain", "reviewed_at")
    op.drop_column("domain", "reviewed_by_user_id")
    op.drop_column("domain", "review_status")
