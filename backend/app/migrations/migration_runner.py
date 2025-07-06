"""
Database migration runner
"""

import aiosqlite
import logging
from pathlib import Path
from typing import List, Dict
import importlib
import os
from datetime import datetime

logger = logging.getLogger(__name__)


class MigrationRunner:
    """Runs database migrations"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        
    async def init_migration_table(self):
        """Create migrations tracking table"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                CREATE TABLE IF NOT EXISTS migrations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    version TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            await db.commit()
            
    async def get_applied_migrations(self) -> List[str]:
        """Get list of applied migration versions"""
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("""
                SELECT version FROM migrations ORDER BY version
            """)
            rows = await cursor.fetchall()
            return [row[0] for row in rows]
            
    async def apply_migration(self, version: str, name: str, up_sql: str):
        """Apply a single migration"""
        async with aiosqlite.connect(self.db_path) as db:
            try:
                # Execute migration
                for statement in up_sql.split(';'):
                    statement = statement.strip()
                    if statement:
                        await db.execute(statement)
                
                # Record migration
                await db.execute("""
                    INSERT INTO migrations (version, name) VALUES (?, ?)
                """, (version, name))
                
                await db.commit()
                logger.info(f"Applied migration {version}: {name}")
                
            except Exception as e:
                await db.rollback()
                logger.error(f"Failed to apply migration {version}: {e}")
                raise
                
    async def run_migrations(self):
        """Run all pending migrations"""
        await self.init_migration_table()
        
        # Get applied migrations
        applied = await self.get_applied_migrations()
        
        # Get migration files
        migrations_dir = Path(__file__).parent
        migration_files = sorted([
            f for f in os.listdir(migrations_dir)
            if f.endswith('.py') and f.startswith('m_')
        ])
        
        # Apply pending migrations
        for migration_file in migration_files:
            version = migration_file.split('_')[1].split('.')[0]  # Extract version from filename
            
            if version not in applied:
                # Import migration module
                module_name = f"app.migrations.{migration_file[:-3]}"
                module = importlib.import_module(module_name)
                
                # Apply migration
                await self.apply_migration(
                    version=version,
                    name=module.NAME,
                    up_sql=module.UP
                )
                
        logger.info("All migrations completed")


async def run_migrations(db_path: str):
    """Convenience function to run migrations"""
    runner = MigrationRunner(db_path)
    await runner.run_migrations()