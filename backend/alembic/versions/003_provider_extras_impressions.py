"""Add live_available, profile_impressions, auto_accept_rules

Revision ID: 003
Revises: 002
Create Date: 2024-01-03 00:00:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("providers", sa.Column("live_available", sa.Boolean(), nullable=False, server_default="true"))
    op.add_column("providers", sa.Column("auto_accept_when_slot_open", sa.Boolean(), nullable=False, server_default="false"))

    op.create_table(
        "profile_impressions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("provider_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("session_id", sa.String(64), nullable=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("source", sa.String(32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["provider_id"], ["providers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_profile_impressions_provider_id", "profile_impressions", ["provider_id"])
    op.create_index("ix_profile_impressions_created_at", "profile_impressions", ["created_at"])


def downgrade() -> None:
    op.drop_table("profile_impressions")
    op.drop_column("providers", "auto_accept_when_slot_open")
    op.drop_column("providers", "live_available")
