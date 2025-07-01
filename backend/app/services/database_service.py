"""
Database service for SQLite operations
"""

import aiosqlite
from typing import Dict, List, Optional
import logging
from datetime import datetime
from pathlib import Path

from app.core.config import settings
from app.models.conversation import ConversationModel, VocabularyModel

logger = logging.getLogger(__name__)


class DatabaseService:
    """Handles all database operations"""
    
    def __init__(self):
        self.db_path = settings.DATABASE_URL.replace("sqlite:///", "")
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        
    async def init_db(self):
        """Initialize database tables"""
        async with aiosqlite.connect(self.db_path) as db:
            # Create sessions table
            await db.execute("""
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    user_id TEXT,
                    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    language_preference TEXT,
                    context_data TEXT
                )
            """)
            
            # Create conversations table
            await db.execute("""
                CREATE TABLE IF NOT EXISTS conversations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT,
                    role TEXT CHECK(role IN ('user', 'assistant')),
                    content TEXT,
                    language TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (session_id) REFERENCES sessions(id)
                )
            """)
            
            # Create vocabulary cache table
            await db.execute("""
                CREATE TABLE IF NOT EXISTS vocabulary_cache (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    japanese_text TEXT,
                    english_text TEXT,
                    context TEXT,
                    source_video_id TEXT,
                    video_timestamp REAL,
                    difficulty_level INTEGER,
                    notion_id TEXT UNIQUE,
                    synced_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create indices
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)
            """)
            
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id)
            """)
            
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_vocabulary_notion_id ON vocabulary_cache(notion_id)
            """)
            
            await db.commit()
            logger.info("Database initialized successfully")
            
    async def save_conversation_turn(
        self,
        session_id: str,
        role: str,
        content: str,
        language: str
    ) -> int:
        """Save a conversation turn"""
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("""
                INSERT INTO conversations (session_id, role, content, language)
                VALUES (?, ?, ?, ?)
            """, (session_id, role, content, language))
            
            await db.commit()
            return cursor.lastrowid
            
    async def get_conversation_history(
        self,
        session_id: str,
        limit: int = 10
    ) -> List[Dict]:
        """Get conversation history for a session"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            
            cursor = await db.execute("""
                SELECT role, content, language, timestamp
                FROM conversations
                WHERE session_id = ?
                ORDER BY timestamp DESC
                LIMIT ?
            """, (session_id, limit))
            
            rows = await cursor.fetchall()
            
            # Convert to list of dicts and reverse to get chronological order
            history = [dict(row) for row in rows]
            history.reverse()
            
            return history
            
    async def save_vocabulary_item(self, vocab_item: VocabularyModel) -> int:
        """Save vocabulary item to cache"""
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("""
                INSERT OR REPLACE INTO vocabulary_cache 
                (japanese_text, english_text, context, source_video_id, 
                 video_timestamp, difficulty_level, notion_id, synced_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                vocab_item.japanese_text,
                vocab_item.english_text,
                vocab_item.context,
                vocab_item.source_video_id,
                vocab_item.video_timestamp,
                vocab_item.difficulty_level,
                vocab_item.notion_id,
                vocab_item.synced_at
            ))
            
            await db.commit()
            return cursor.lastrowid
            
    async def get_vocabulary_items(
        self,
        limit: int = 50,
        difficulty_level: Optional[int] = None
    ) -> List[Dict]:
        """Get vocabulary items from cache"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            
            query = """
                SELECT * FROM vocabulary_cache
                WHERE 1=1
            """
            params = []
            
            if difficulty_level is not None:
                query += " AND difficulty_level = ?"
                params.append(difficulty_level)
                
            query += " ORDER BY created_at DESC LIMIT ?"
            params.append(limit)
            
            cursor = await db.execute(query, params)
            rows = await cursor.fetchall()
            
            return [dict(row) for row in rows]
            
    async def search_vocabulary(self, search_term: str) -> List[Dict]:
        """Search vocabulary items"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            
            cursor = await db.execute("""
                SELECT * FROM vocabulary_cache
                WHERE japanese_text LIKE ? OR english_text LIKE ? OR context LIKE ?
                ORDER BY created_at DESC
                LIMIT 20
            """, (f"%{search_term}%", f"%{search_term}%", f"%{search_term}%"))
            
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]
            
    async def get_statistics(self) -> Dict:
        """Get database statistics"""
        async with aiosqlite.connect(self.db_path) as db:
            # Total conversations
            cursor = await db.execute("SELECT COUNT(*) FROM conversations")
            total_conversations = (await cursor.fetchone())[0]
            
            # Total vocabulary items
            cursor = await db.execute("SELECT COUNT(*) FROM vocabulary_cache")
            total_vocabulary = (await cursor.fetchone())[0]
            
            # Active sessions (in last hour)
            cursor = await db.execute("""
                SELECT COUNT(DISTINCT session_id) FROM conversations
                WHERE timestamp > datetime('now', '-1 hour')
            """)
            active_sessions = (await cursor.fetchone())[0]
            
            return {
                "total_conversations": total_conversations,
                "total_vocabulary": total_vocabulary,
                "active_sessions": active_sessions
            }


# Global database service instance
db_service = DatabaseService()


async def init_db():
    """Initialize database (called on startup)"""
    await db_service.init_db()