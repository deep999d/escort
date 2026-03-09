"""Add name to saved_searches.

Revision ID: 006
Revises: 005
Create Date: 2024-01-06 00:00:00

"""
from alembic import op
import sqlalchemy as sa

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("saved_searches", sa.Column("name", sa.String(200), nullable=True))


def downgrade() -> None:
    op.drop_column("saved_searches", "name")
