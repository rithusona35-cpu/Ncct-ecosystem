"""create_employment_records_and_feedback

Revision ID: e5c21980ab12
Revises: b4a8621ec456
Create Date: 2026-09-27 13:38:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e5c21980ab12'
down_revision: Union[str, Sequence[str], None] = 'b4a8621ec456'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    # 1. employment_records
    if "employment_records" not in tables:
        op.create_table(
            'employment_records',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('trainee_id', sa.Integer(), nullable=False),
            sa.Column('employer_id', sa.Integer(), nullable=False),
            sa.Column('job_posting_id', sa.Integer(), nullable=False),
            sa.Column('hired_date', sa.DateTime(), nullable=False),
            sa.Column('status', sa.String(length=50), nullable=False, server_default='ACTIVE'),
            sa.ForeignKeyConstraint(['trainee_id'], ['users.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['employer_id'], ['users.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['job_posting_id'], ['job_postings.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_employment_records_id'), 'employment_records', ['id'], unique=False)
        op.create_index(op.f('ix_employment_records_trainee_id'), 'employment_records', ['trainee_id'], unique=False)
        op.create_index(op.f('ix_employment_records_employer_id'), 'employment_records', ['employer_id'], unique=False)
        op.create_index(op.f('ix_employment_records_job_posting_id'), 'employment_records', ['job_posting_id'], unique=False)

    # 2. employer_feedback
    if "employer_feedback" not in tables:
        op.create_table(
            'employer_feedback',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('employment_record_id', sa.Integer(), nullable=False),
            sa.Column('skill_id', sa.Integer(), nullable=False),
            sa.Column('rating', sa.String(length=50), nullable=False),
            sa.Column('comments', sa.String(length=2000), nullable=True),
            sa.Column('submitted_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['employment_record_id'], ['employment_records.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['skill_id'], ['skills.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_employer_feedback_id'), 'employer_feedback', ['id'], unique=False)
        op.create_index(op.f('ix_employer_feedback_employment_record_id'), 'employer_feedback', ['employment_record_id'], unique=False)
        op.create_index(op.f('ix_employer_feedback_skill_id'), 'employer_feedback', ['skill_id'], unique=False)


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if "employer_feedback" in tables:
        try:
            op.drop_index(op.f('ix_employer_feedback_skill_id'), table_name='employer_feedback')
            op.drop_index(op.f('ix_employer_feedback_employment_record_id'), table_name='employer_feedback')
            op.drop_index(op.f('ix_employer_feedback_id'), table_name='employer_feedback')
        except Exception:
            pass
        op.drop_table('employer_feedback')

    if "employment_records" in tables:
        try:
            op.drop_index(op.f('ix_employment_records_job_posting_id'), table_name='employment_records')
            op.drop_index(op.f('ix_employment_records_employer_id'), table_name='employment_records')
            op.drop_index(op.f('ix_employment_records_trainee_id'), table_name='employment_records')
            op.drop_index(op.f('ix_employment_records_id'), table_name='employment_records')
        except Exception:
            pass
        op.drop_table('employment_records')
