from logging.config import fileConfig
import os
import sys

from alembic import context

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

sys.path.insert(0, os.path.realpath(os.path.join(os.path.dirname(__file__), '..')))

from app.config import settings
from app.database import Base, db_url, engine
from app import models  # ensure all models are registered
target_metadata = Base.metadata

# Ensure alembic config uses the dynamically resolved db_url (with postgresql:// and sslmode=require)
config.set_main_option("sqlalchemy.url", db_url)

def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url") or db_url
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    # Use the application's engine with proper connection pooling, URL normalization, and SSL mode
    connectable = engine

    with connectable.connect() as connection:
        # Ensure base metadata tables exist before applying incremental revisions
        Base.metadata.create_all(bind=connection)

        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()
        connection.commit()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

