"""Add availability_pings table

Revision ID: 002
Revises: 001
Create Date: 2024-01-02 00:00:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "availability_pings",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("provider_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("search_session_id", sa.String(64), nullable=False),
        sa.Column("intent_summary", sa.Text(), nullable=False),
        sa.Column("requested_slot_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("requested_slot_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
        sa.Column("provider_responded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("provider_notes", sa.Text(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["provider_id"], ["providers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_availability_pings_provider_id", "availability_pings", ["provider_id"])
    op.create_index("ix_availability_pings_search_session_id", "availability_pings", ["search_session_id"])
    op.create_index("ix_availability_pings_status", "availability_pings", ["status"])


def downgrade() -> None:
    op.drop_table("availability_pings")
