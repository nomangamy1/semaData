"""Add upvotes to community_posts

Revision ID: fb5accc5833a
Revises: cfd5d4e5c7b1
Create Date: 2026-08-18 23:42:52.720846

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'fb5accc5833a'
down_revision = 'cfd5d4e5c7b1'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not inspector.has_table('response_upvotes'):
        op.create_table(
            'response_upvotes',
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('response_id', sa.Integer(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['response_id'], ['community_responses.id']),
            sa.ForeignKeyConstraint(['user_id'], ['Users.id']),
            sa.PrimaryKeyConstraint('user_id', 'response_id'),
        )

    if 'upvotes' not in {column['name'] for column in inspector.get_columns('community_posts')}:
        op.add_column('community_posts', sa.Column('upvotes', sa.Integer(), nullable=True))

    response_columns = {column['name'] for column in inspector.get_columns('community_responses')}
    if 'author_id' not in response_columns:
        if 'user_id' not in response_columns:
            raise RuntimeError(
                "Cannot migrate community_responses: neither author_id nor user_id exists."
            )
        op.add_column(
            'community_responses',
            sa.Column('author_id', sa.Integer(), nullable=True),
        )

    if 'user_id' in response_columns:
        op.execute(
            sa.text(
                'UPDATE community_responses '
                'SET author_id = COALESCE(author_id, user_id) '
                'WHERE author_id IS NULL'
            )
        )

    op.alter_column(
        'community_responses',
        'author_id',
        existing_type=sa.Integer(),
        nullable=False,
    )
    author_fk_exists = any(
        foreign_key.get('constrained_columns') == ['author_id']
        and foreign_key.get('referred_table') == 'Users'
        for foreign_key in inspector.get_foreign_keys('community_responses')
    )
    if not author_fk_exists:
        op.create_foreign_key(
            'fk_community_responses_author_id_users',
            'community_responses',
            'Users',
            ['author_id'],
            ['id'],
        )

    if 'user_id' in response_columns:
        foreign_keys = inspector.get_foreign_keys('community_responses')
        user_fk = next(
            (
                foreign_key['name']
                for foreign_key in foreign_keys
                if foreign_key.get('constrained_columns') == ['user_id']
                and foreign_key.get('referred_table') == 'Users'
            ),
            None,
        )
        if user_fk:
            op.drop_constraint(user_fk, 'community_responses', type_='foreignkey')
        op.drop_column('community_responses', 'user_id')


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if inspector.has_table('community_responses'):
        response_columns = {column['name'] for column in inspector.get_columns('community_responses')}
        if 'user_id' not in response_columns:
            op.add_column(
                'community_responses',
                sa.Column('user_id', sa.Integer(), nullable=True),
            )
            op.execute(
                sa.text('UPDATE community_responses SET user_id = author_id WHERE user_id IS NULL')
            )
            op.alter_column(
                'community_responses',
                'user_id',
                existing_type=sa.Integer(),
                nullable=False,
            )
            op.create_foreign_key(
                'community_responses_user_id_fkey',
                'community_responses',
                'Users',
                ['user_id'],
                ['id'],
            )
        author_fk = next(
            (
                foreign_key['name']
                for foreign_key in inspector.get_foreign_keys('community_responses')
                if foreign_key.get('constrained_columns') == ['author_id']
                and foreign_key.get('referred_table') == 'Users'
            ),
            None,
        )
        if author_fk:
            op.drop_constraint(author_fk, 'community_responses', type_='foreignkey')
        op.drop_column('community_responses', 'author_id')

    if inspector.has_table('community_posts'):
        post_columns = {column['name'] for column in inspector.get_columns('community_posts')}
        if 'upvotes' in post_columns:
            op.drop_column('community_posts', 'upvotes')

    if inspector.has_table('response_upvotes'):
        op.drop_table('response_upvotes')
