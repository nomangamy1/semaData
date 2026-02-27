"""add reviewed_by_user_id column to job_applications

Revision ID: add_reviewed_by_user_id
Revises: 21b51d88ce77
Create Date: 2026-02-27 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_reviewed_by_user_id'
down_revision = '21b51d88ce77'
branch_labels = None
depends_on = None


def upgrade():
    # add reviewed_by_user_id column with foreign key to Users.id
    op.add_column('job_applications', sa.Column('reviewed_by_user_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_jobapplications_reviewed_by_user',
        'job_applications', 'Users',
        ['reviewed_by_user_id'], ['id'],
        ondelete='SET NULL'
    )


def downgrade():
    op.drop_constraint('fk_jobapplications_reviewed_by_user', 'job_applications', type_='foreignkey')
    op.drop_column('job_applications', 'reviewed_by_user_id')
