"""add_scheduler_column

Revision ID: 722f8f4a675e
Revises: 08010a7db8bd
Create Date: 2026-01-01 16:28:26.058999

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '722f8f4a675e'
down_revision: Union[str, Sequence[str], None] = '08010a7db8bd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add scheduler column to generations table."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing = {c['name'] for c in inspector.get_columns('generations')}

    if 'scheduler' not in existing:
        op.add_column(
            'generations',
            sa.Column('scheduler', sa.String(50), nullable=True, server_default='karras')
        )


def downgrade() -> None:
    """Remove scheduler column from generations table."""
    op.drop_column('generations', 'scheduler')
