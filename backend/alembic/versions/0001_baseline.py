"""baseline

Revision ID: 0001
Revises: None
Create Date: 2026-02-19 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0001'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create all tables."""
    op.create_table(
        "portfolios",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("cover_image_id", sa.String(36), nullable=True),
        sa.Column("created_at", sa.DateTime()),
        sa.Column("updated_at", sa.DateTime()),
    )

    op.create_table(
        "workflow_templates",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("workflow_json", sa.Text(), nullable=False),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("is_builtin", sa.Boolean(), default=False),
        sa.Column("created_at", sa.DateTime()),
        sa.Column("updated_at", sa.DateTime()),
    )

    op.create_table(
        "generations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("portfolio_id", sa.String(36), sa.ForeignKey("portfolios.id"), nullable=False),
        sa.Column("generation_type", sa.String(20), nullable=False, server_default="txt2img"),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("negative_prompt", sa.Text(), nullable=True),
        sa.Column("width", sa.Integer(), nullable=False, server_default="512"),
        sa.Column("height", sa.Integer(), nullable=False, server_default="512"),
        sa.Column("seed", sa.Integer(), nullable=True),
        sa.Column("steps", sa.Integer(), nullable=False, server_default="20"),
        sa.Column("cfg_scale", sa.Float(), nullable=False, server_default="7.0"),
        sa.Column("sampler", sa.String(50), nullable=False, server_default="euler"),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("progress", sa.Float(), nullable=False, server_default="0"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("image_path", sa.String(500), nullable=True),
        sa.Column("thumbnail_path", sa.String(500), nullable=True),
        sa.Column("parent_id", sa.String(36), sa.ForeignKey("generations.id"), nullable=True),
        sa.Column("source_generation_id", sa.String(36), sa.ForeignKey("generations.id"), nullable=True),
        sa.Column("workflow_id", sa.String(36), sa.ForeignKey("workflow_templates.id"), nullable=True),
        sa.Column("model_filename", sa.String(255), nullable=True),
        sa.Column("lora_filename", sa.String(255), nullable=True),
        sa.Column("mask_path", sa.String(500), nullable=True),
        sa.Column("denoising_strength", sa.Float(), nullable=True),
        sa.Column("grow_mask_by", sa.Integer(), nullable=True),
        sa.Column("upscale_factor", sa.Float(), nullable=True),
        sa.Column("upscale_model", sa.String(255), nullable=True),
        sa.Column("sharpen_amount", sa.Float(), nullable=True),
        sa.Column("outpaint_left", sa.Integer(), nullable=True),
        sa.Column("outpaint_right", sa.Integer(), nullable=True),
        sa.Column("outpaint_top", sa.Integer(), nullable=True),
        sa.Column("outpaint_bottom", sa.Integer(), nullable=True),
        sa.Column("outpaint_feather", sa.Integer(), nullable=True),
        sa.Column("video_path", sa.String(500), nullable=True),
        sa.Column("motion_bucket_id", sa.Integer(), nullable=True),
        sa.Column("fps", sa.Integer(), nullable=True),
        sa.Column("duration_seconds", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime()),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("generations")
    op.drop_table("workflow_templates")
    op.drop_table("portfolios")
