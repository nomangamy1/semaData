"""Restore collector earnings ledger.

Revision ID: c4e9a1f2b7d0
Revises: 3d7c9a5e1b42
"""
from alembic import op
import sqlalchemy as sa


revision = "c4e9a1f2b7d0"
down_revision = "3d7c9a5e1b42"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "collector_earnings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("collector_id", sa.Integer(), nullable=False),
        sa.Column("dataset_id", sa.Integer(), nullable=False),
        sa.Column("domain_id", sa.Integer(), nullable=True),
        sa.Column("amount", sa.Float(), server_default="0", nullable=False),
        sa.Column("quality_multiplier", sa.Float(), server_default="1.0"),
        sa.Column("status", sa.String(length=20), server_default="earned"),
        sa.Column("transaction_ref", sa.String(length=100)),
        sa.Column(
            "processed_at",
            sa.DateTime(),
            server_default=sa.func.current_timestamp(),
        ),
        sa.ForeignKeyConstraint(["collector_id"], ["Users.id"]),
        sa.ForeignKeyConstraint(["dataset_id"], ["datasets.id"]),
        sa.ForeignKeyConstraint(["domain_id"], ["domain.id"]),
    )
    op.create_index(
        "ix_collector_earnings_collector",
        "collector_earnings",
        ["collector_id"],
    )
    op.create_index(
        "ix_collector_earnings_dataset",
        "collector_earnings",
        ["dataset_id"],
    )


def downgrade():
    op.drop_index(
        "ix_collector_earnings_dataset",
        table_name="collector_earnings",
    )
    op.drop_index(
        "ix_collector_earnings_collector",
        table_name="collector_earnings",
    )
    op.drop_table("collector_earnings")