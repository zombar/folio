"""baseline

Revision ID: 922a42abde2d
Revises:
Create Date: 2025-12-31 19:12:31.357462

This is an empty baseline migration. It serves as a marker for databases that
existed before alembic was introduced. New databases have tables created by
SQLAlchemy's create_all() and are stamped at head. Pre-alembic databases are
stamped at this baseline, then subsequent migrations bring them up to date.
"""
from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = '922a42abde2d'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Empty baseline - tables already exist or were created by create_all()."""
    pass


def downgrade() -> None:
    """Cannot downgrade past baseline."""
    pass
