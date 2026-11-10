"""add community posts table

Revision ID: b8bbd4bf1782
Revises: a93af7473108
Create Date: 2026-04-28 11:00:08.573049

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b8bbd4bf1782'
down_revision = 'a93af7473108'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'community_posts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('author_id', sa.Integer(), nullable=False),
        sa.Column('author_type', sa.String(length=50), server_default='community', nullable=True),
        sa.Column('post_type', sa.String(length=20), server_default='post', nullable=False),
        sa.Column('title', sa.String(length=255), nullable=True),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('likes', sa.Integer(), server_default='0', nullable=True),
        sa.Column('reply_count', sa.Integer(), server_default='0', nullable=True),
        sa.Column('domain_ref', sa.String(length=100), nullable=True),
        sa.Column('domain_name', sa.String(length=100), nullable=True),
        sa.Column('is_pinned', sa.Boolean(), server_default='false', nullable=True),
        sa.Column('reward_description', sa.String(length=255), nullable=True),
        sa.Column('challenge_deadline', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_community_posts_author', 'community_posts', ['author_id'])
    op.create_index('ix_community_posts_created', 'community_posts', ['created_at'])
    op.create_index('ix_community_posts_type', 'community_posts', ['post_type'])

    op.create_table(
        'quality_flags',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=20), server_default='open', nullable=True),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        sa.Column('reporter_id', sa.Integer(), nullable=True),
        sa.Column('domain_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['reporter_id'], ['Users.id']),
        sa.ForeignKeyConstraint(['domain_id'], ['domain.id']),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade():
    op.drop_table('quality_flags')
    op.drop_index('ix_community_posts_type', table_name='community_posts')
    op.drop_index('ix_community_posts_created', table_name='community_posts')
    op.drop_index('ix_community_posts_author', table_name='community_posts')
    op.drop_table('community_posts')
