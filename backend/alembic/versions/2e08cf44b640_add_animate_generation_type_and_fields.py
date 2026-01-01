"""add_animate_generation_type_and_fields

Revision ID: 2e08cf44b640
Revises: 922a42abde2d
Create Date: 2025-12-31 19:19:28.751894

This migration serves two purposes:
1. For pre-alembic databases: adds all columns that may be missing
2. For new databases: adds animation-specific fields (video_path, etc.)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2e08cf44b640'
down_revision: Union[str, Sequence[str], None] = '922a42abde2d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# All columns that should exist on generations table after this migration
GENERATIONS_COLUMNS = [
    # Core fields (likely exist in all databases)
    # ('id', sa.String(length=36)),  # PK, always exists
    # ('portfolio_id', sa.String(length=36)),  # FK, always exists
    # ('prompt', sa.Text()),  # always exists
    # etc...

    # Fields that may be missing in pre-alembic databases
    ('generation_type', sa.String(length=20)),
    ('source_generation_id', sa.String(length=36)),
    ('mask_path', sa.String(length=500)),
    ('denoising_strength', sa.Float()),
    ('grow_mask_by', sa.Integer()),
    ('upscale_factor', sa.Float()),
    ('upscale_model', sa.String(length=100)),
    ('sharpen_amount', sa.Float()),
    ('outpaint_left', sa.Integer()),
    ('outpaint_right', sa.Integer()),
    ('outpaint_top', sa.Integer()),
    ('outpaint_bottom', sa.Integer()),
    ('outpaint_feather', sa.Integer()),

    # Animation fields (new in this migration)
    ('video_path', sa.String(length=500)),
    ('motion_bucket_id', sa.Integer()),
    ('fps', sa.Integer()),
    ('duration_seconds', sa.Float()),
]


def upgrade() -> None:
    """Add missing columns to generations table."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing = {c['name'] for c in inspector.get_columns('generations')}

    for col_name, col_type in GENERATIONS_COLUMNS:
        if col_name not in existing:
            op.add_column('generations', sa.Column(col_name, col_type, nullable=True))


def downgrade() -> None:
    """Remove animation-specific columns only (preserve pre-alembic compatibility columns)."""
    op.drop_column('generations', 'duration_seconds')
    op.drop_column('generations', 'fps')
    op.drop_column('generations', 'motion_bucket_id')
    op.drop_column('generations', 'video_path')
