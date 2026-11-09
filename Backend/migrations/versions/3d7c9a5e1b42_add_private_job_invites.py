"""Add invite-only jobs and one-time applicant links.

Revision ID: 3d7c9a5e1b42
Revises: 9c4e7a1b6d32
Create Date: 2026-11-08
"""
from alembic import op
import sqlalchemy as sa


revision = "3d7c9a5e1b42"
down_revision = "9c4e7a1b6d32"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "jobs",
        sa.Column("visibility", sa.String(length=20), nullable=False, server_default="public"),
    )
    op.alter_column("jobs", "visibility", server_default=None)
    op.create_table(
        "job_invites",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("job_id", sa.Integer(), sa.ForeignKey("jobs.id"), nullable=False),
        sa.Column("email", sa.String(length=120), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("used_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_job_invites_job_id", "job_invites", ["job_id"])
    op.create_index("ix_job_invites_email", "job_invites", ["email"])
    op.create_index("ix_job_invites_token_hash", "job_invites", ["token_hash"], unique=True)


def downgrade():
    op.drop_index("ix_job_invites_token_hash", table_name="job_invites")
    op.drop_index("ix_job_invites_email", table_name="job_invites")
    op.drop_index("ix_job_invites_job_id", table_name="job_invites")
    op.drop_table("job_invites")
    op.drop_column("jobs", "visibility")
