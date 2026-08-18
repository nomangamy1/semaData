"""add community profile and topic fields

Revision ID: d3a8c32be5b7
Revises: 165158d0020d
Create Date: 2026-07-21 22:40:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd3a8c32be5b7'
down_revision = '165158d0020d'
branch_labels = None
depends_on = None


def _column_exists(table_name, column_name):
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade():
    # Users profile/role fields for community discovery
    with op.batch_alter_table('Users', schema=None) as batch_op:
        if not _column_exists('Users', 'community_role'):
            batch_op.add_column(sa.Column('community_role', sa.String(length=50), nullable=False, server_default='student'))
        if not _column_exists('Users', 'headline'):
            batch_op.add_column(sa.Column('headline', sa.String(length=140), nullable=True))
        if not _column_exists('Users', 'bio'):
            batch_op.add_column(sa.Column('bio', sa.Text(), nullable=True))
        if not _column_exists('Users', 'expertise'):
            batch_op.add_column(sa.Column('expertise', sa.JSON(), nullable=True))
        if not _column_exists('Users', 'research_interests'):
            batch_op.add_column(sa.Column('research_interests', sa.JSON(), nullable=True))
        if not _column_exists('Users', 'skills'):
            batch_op.add_column(sa.Column('skills', sa.JSON(), nullable=True))
        if not _column_exists('Users', 'social_links'):
            batch_op.add_column(sa.Column('social_links', sa.JSON(), nullable=True))
        if not _column_exists('Users', 'created_at'):
            batch_op.add_column(sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')))
        if not _column_exists('Users', 'reputation_score'):
            batch_op.add_column(sa.Column('reputation_score', sa.Integer(), nullable=False, server_default='0'))

    # Community posts topic + discovery support
    with op.batch_alter_table('community_posts', schema=None) as batch_op:
        if not _column_exists('community_posts', 'topic_category'):
            batch_op.add_column(sa.Column('topic_category', sa.String(length=50), nullable=True, server_default='General'))
        if not _column_exists('community_posts', 'tags'):
            batch_op.add_column(sa.Column('tags', sa.JSON(), nullable=True))
        if not _column_exists('community_posts', 'reply_count'):
            batch_op.add_column(sa.Column('reply_count', sa.Integer(), nullable=False, server_default='0'))

    # Community responses vote support
    with op.batch_alter_table('community_responses', schema=None) as batch_op:
        if not _column_exists('community_responses', 'upvotes'):
            batch_op.add_column(sa.Column('upvotes', sa.Integer(), nullable=False, server_default='0'))
        if not _column_exists('community_responses', 'author_id'):
            batch_op.add_column(sa.Column('author_id', sa.Integer(), nullable=True))
            try:
                batch_op.create_foreign_key(
                    'fk_community_responses_author_id_users',
                    'Users',
                    ['author_id'],
                    ['id']
                )
            except Exception:
                pass


def downgrade():
    with op.batch_alter_table('community_responses', schema=None) as batch_op:
        if _column_exists('community_responses', 'upvotes'):
            batch_op.drop_column('upvotes')
        if _column_exists('community_responses', 'author_id'):
            try:
                batch_op.drop_constraint('fk_community_responses_author_id_users', type_='foreignkey')
            except Exception:
                pass
            batch_op.drop_column('author_id')

    with op.batch_alter_table('community_posts', schema=None) as batch_op:
        if _column_exists('community_posts', 'topic_category'):
            batch_op.drop_column('topic_category')
        if _column_exists('community_posts', 'tags'):
            batch_op.drop_column('tags')
        if _column_exists('community_posts', 'reply_count'):
            batch_op.drop_column('reply_count')

    with op.batch_alter_table('Users', schema=None) as batch_op:
        for col in ['community_role', 'headline', 'bio', 'expertise', 'research_interests', 'skills', 'social_links', 'created_at', 'reputation_score']:
            if _column_exists('Users', col):
                batch_op.drop_column(col)
