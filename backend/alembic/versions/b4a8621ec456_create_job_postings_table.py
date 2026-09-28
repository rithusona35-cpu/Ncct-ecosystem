"""create_job_postings_table

Revision ID: b4a8621ec456
Revises: 
Create Date: 2026-09-27 13:06:47.625948

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b4a8621ec456'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    
    if "job_postings" not in tables:
        op.create_table(
            'job_postings',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('employer_id', sa.Integer(), nullable=False),
            sa.Column('job_role_id', sa.Integer(), nullable=False),
            sa.Column('title', sa.String(length=255), nullable=False),
            sa.Column('description', sa.String(length=2000), nullable=True),
            sa.Column('location', sa.String(length=255), nullable=False, server_default='National / Hybrid'),
            sa.Column('posted_at', sa.DateTime(), nullable=False),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.ForeignKeyConstraint(['employer_id'], ['users.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['job_role_id'], ['job_roles.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_job_postings_id'), 'job_postings', ['id'], unique=False)
        op.create_index(op.f('ix_job_postings_employer_id'), 'job_postings', ['employer_id'], unique=False)
        op.create_index(op.f('ix_job_postings_job_role_id'), 'job_postings', ['job_role_id'], unique=False)
    else:
        columns = [c['name'] for c in inspector.get_columns('job_postings')]
        if 'is_active' not in columns:
            op.add_column('job_postings', sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    if "job_postings" in tables:
        try:
            op.drop_index(op.f('ix_job_postings_job_role_id'), table_name='job_postings')
            op.drop_index(op.f('ix_job_postings_employer_id'), table_name='job_postings')
            op.drop_index(op.f('ix_job_postings_id'), table_name='job_postings')
        except Exception:
            pass
        op.drop_table('job_postings')

