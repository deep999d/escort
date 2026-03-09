"""Demo mode: session_id on bookings and favorites (no login required).

Revision ID: 005
Revises: 004
Create Date: 2024-01-05 00:00:00

"""
from alembic import op
import sqlalchemy as sa

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("bookings", sa.Column("session_id", sa.String(64), nullable=True))
    op.create_index("ix_bookings_session_id", "bookings", ["session_id"])

    op.add_column("favorites", sa.Column("session_id", sa.String(64), nullable=True))
    op.alter_column("favorites", "user_id", existing_type=sa.dialects.postgresql.UUID(), nullable=True)
    op.create_index("ix_favorites_session_id", "favorites", ["session_id"])
    op.execute(
        "CREATE UNIQUE INDEX uq_favorites_session_provider ON favorites (session_id, provider_id) WHERE session_id IS NOT NULL"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_favorites_session_provider")
    op.drop_index("ix_favorites_session_id", "favorites")
    op.alter_column("favorites", "user_id", existing_type=sa.dialects.postgresql.UUID(), nullable=False)
    op.drop_column("favorites", "session_id")
    op.drop_index("ix_bookings_session_id", "bookings")
    op.drop_column("bookings", "session_id")
