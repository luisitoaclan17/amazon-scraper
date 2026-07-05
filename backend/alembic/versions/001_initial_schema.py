"""Initial schema creation

Revision ID: 001_initial
Revises: 
Create Date: 2026-07-03 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('email', sa.String(), nullable=False, unique=True, index=True),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('role', sa.String(), nullable=True, default='user'),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.func.now()),
    )

    # Create jobs table
    op.create_table(
        'jobs',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('status', sa.String(), nullable=True, default='queued'),
        sa.Column('total_urls', sa.Integer(), nullable=True, default=0),
        sa.Column('completed_count', sa.Integer(), nullable=True, default=0),
        sa.Column('failed_count', sa.Integer(), nullable=True, default=0),
        sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.func.now()),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('log_file', sa.String(), nullable=True),
    )
    op.create_index('ix_jobs_user_id', 'jobs', ['user_id'])

    # Create products table
    op.create_table(
        'products',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('job_id', sa.Integer(), sa.ForeignKey('jobs.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.Text(), nullable=True),
        sa.Column('price', sa.Float(), nullable=True),
        sa.Column('original_price', sa.Float(), nullable=True),
        sa.Column('discount', sa.Float(), nullable=True),
        sa.Column('rating', sa.Float(), nullable=True),
        sa.Column('review_count', sa.Integer(), nullable=True, default=0),
        sa.Column('category', sa.String(), nullable=True),
        sa.Column('brand', sa.String(), nullable=True),
        sa.Column('asin', sa.String(), nullable=True),
        sa.Column('availability', sa.Boolean(), nullable=True, default=True),
        sa.Column('prime', sa.Boolean(), nullable=True, default=False),
        sa.Column('currency', sa.String(), nullable=True, default='USD'),
        sa.Column('image_url', sa.Text(), nullable=True),
        sa.Column('product_url', sa.Text(), nullable=True),
        sa.Column('scraped_at', sa.DateTime(), nullable=True, server_default=sa.func.now()),
    )
    op.create_index('ix_products_job_id', 'products', ['job_id'])
    op.create_index('ix_products_asin', 'products', ['asin'])

    # Create exports table
    op.create_table(
        'exports',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('job_id', sa.Integer(), sa.ForeignKey('jobs.id', ondelete='CASCADE'), nullable=False),
        sa.Column('file_path', sa.String(), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('format', sa.String(), nullable=True, default='csv'),
        sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.func.now()),
    )

    # Create logs table
    op.create_table(
        'logs',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('job_id', sa.Integer(), sa.ForeignKey('jobs.id', ondelete='CASCADE'), nullable=False),
        sa.Column('level', sa.String(), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=True, server_default=sa.func.now()),
    )
    op.create_index('ix_logs_job_id', 'logs', ['job_id'])


def downgrade() -> None:
    op.drop_table('logs')
    op.drop_table('exports')
    op.drop_table('products')
    op.drop_table('jobs')
    op.drop_table('users')
