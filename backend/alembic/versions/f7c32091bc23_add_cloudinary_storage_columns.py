"""add_cloudinary_storage_columns

Revision ID: f7c32091bc23
Revises: e5c21980ab12
Create Date: 2026-09-28 10:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'f7c32091bc23'
down_revision: Union[str, Sequence[str], None] = 'e5c21980ab12'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    # 1. Add url column to content_items if missing
    if "content_items" in tables:
        columns = [c["name"] for c in inspector.get_columns("content_items")]
        if "url" not in columns:
            op.add_column("content_items", sa.Column("url", sa.String(500), nullable=True))

    # 2. Add pdf_url column to certificates if missing
    if "certificates" in tables:
        columns = [c["name"] for c in inspector.get_columns("certificates")]
        if "pdf_url" not in columns:
            op.add_column("certificates", sa.Column("pdf_url", sa.String(500), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if "certificates" in tables:
        columns = [c["name"] for c in inspector.get_columns("certificates")]
        if "pdf_url" in columns:
            op.drop_column("certificates", "pdf_url")

    if "content_items" in tables:
        columns = [c["name"] for c in inspector.get_columns("content_items")]
        if "url" in columns:
            op.drop_column("content_items", "url")
