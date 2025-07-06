"""
Database service for SQLite operations
"""

import aiosqlite
from typing import Dict, List, Optional
import logging
from datetime import datetime
from pathlib import Path
import json

from app.core.config import settings
from app.models.conversation import ConversationModel, VocabularyModel

logger = logging.getLogger(__name__)


class DatabaseService:
    """Handles all database operations"""
    
    def __init__(self):
        self.db_path = settings.DATABASE_URL.replace("sqlite:///", "")
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        
    async def init_db(self):
        """Initialize database tables and run migrations"""
        # Run migrations first
        from app.migrations.migration_runner import run_migrations
        await run_migrations(self.db_path)
        
        # Then create any remaining tables (for backward compatibility)
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
            
            # Create vocabulary cache table (note: user_id will be added by migration)
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
            
    async def save_vocabulary_item(self, vocab_item: VocabularyModel, user_id: Optional[int] = None) -> int:
        """Save vocabulary item to cache"""
        async with aiosqlite.connect(self.db_path) as db:
            # Check if user_id column exists (after migration)
            cursor = await db.execute("PRAGMA table_info(vocabulary_cache)")
            columns = await cursor.fetchall()
            has_user_id = any(col[1] == 'user_id' for col in columns)
            
            if has_user_id and user_id:
                cursor = await db.execute("""
                    INSERT OR REPLACE INTO vocabulary_cache 
                    (japanese_text, english_text, context, source_video_id, 
                     video_timestamp, difficulty_level, notion_id, synced_at, user_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    vocab_item.japanese_text,
                    vocab_item.english_text,
                    vocab_item.context,
                    vocab_item.source_video_id,
                    vocab_item.video_timestamp,
                    vocab_item.difficulty_level,
                    vocab_item.notion_id,
                    vocab_item.synced_at,
                    user_id
                ))
            else:
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
        difficulty_level: Optional[int] = None,
        user_id: Optional[int] = None
    ) -> List[Dict]:
        """Get vocabulary items from cache"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            
            # Check if user_id column exists
            cursor = await db.execute("PRAGMA table_info(vocabulary_cache)")
            columns = await cursor.fetchall()
            has_user_id = any(col[1] == 'user_id' for col in columns)
            
            query = """
                SELECT * FROM vocabulary_cache
                WHERE 1=1
            """
            params = []
            
            if has_user_id and user_id is not None:
                query += " AND user_id = ?"
                params.append(user_id)
            
            if difficulty_level is not None:
                query += " AND difficulty_level = ?"
                params.append(difficulty_level)
                
            query += " ORDER BY created_at DESC LIMIT ?"
            params.append(limit)
            
            cursor = await db.execute(query, params)
            rows = await cursor.fetchall()
            
            # Transform database fields to match frontend expectations
            items = []
            for row in rows:
                row_dict = dict(row)
                item = {
                    "id": row_dict["id"],
                    "japanese": row_dict["japanese_text"],
                    "english": row_dict["english_text"],
                    "reading": row_dict.get("reading", ""),
                    "difficulty": row_dict["difficulty_level"],
                    "context": row_dict.get("context", ""),
                    "tags": json.loads(row_dict["tags"]) if row_dict.get("tags") else [],
                    "source": row_dict.get("source", "youtube"),
                    "video_id": row_dict.get("source_video_id"),
                    "timestamp": row_dict.get("video_timestamp"),
                    "notes": row_dict.get("notes", ""),
                    "created_at": row_dict["created_at"]
                }
                items.append(item)
            
            return items
            
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
            
            # Transform database fields to match frontend expectations
            items = []
            for row in rows:
                row_dict = dict(row)
                item = {
                    "id": row_dict["id"],
                    "japanese": row_dict["japanese_text"],
                    "english": row_dict["english_text"],
                    "reading": row_dict.get("reading", ""),
                    "difficulty": row_dict["difficulty_level"],
                    "context": row_dict.get("context", ""),
                    "tags": json.loads(row_dict["tags"]) if row_dict.get("tags") else [],
                    "source": row_dict.get("source", "youtube"),
                    "video_id": row_dict.get("source_video_id"),
                    "timestamp": row_dict.get("video_timestamp"),
                    "notes": row_dict.get("notes", ""),
                    "created_at": row_dict["created_at"]
                }
                items.append(item)
            
            return items
            
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
            
    async def get_user_progress(self, user_id: int, vocabulary_id: int) -> Optional[Dict]:
        """Get user's progress for a specific vocabulary item"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            
            cursor = await db.execute("""
                SELECT * FROM user_progress
                WHERE user_id = ? AND vocabulary_id = ?
            """, (user_id, vocabulary_id))
            
            row = await cursor.fetchone()
            return dict(row) if row else None
            
    async def update_user_progress(self, user_id: int, vocabulary_id: int, progress_data: Dict) -> Dict:
        """Create or update user's progress for a vocabulary item"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            
            # Check if progress exists
            existing = await self.get_user_progress(user_id, vocabulary_id)
            
            if existing:
                # Update existing progress
                update_fields = []
                params = []
                
                for field, value in progress_data.items():
                    if field not in ['id', 'user_id', 'vocabulary_id', 'created_at']:
                        update_fields.append(f"{field} = ?")
                        params.append(value)
                
                if update_fields:
                    params.extend([user_id, vocabulary_id])
                    await db.execute(f"""
                        UPDATE user_progress
                        SET {', '.join(update_fields)}, updated_at = CURRENT_TIMESTAMP
                        WHERE user_id = ? AND vocabulary_id = ?
                    """, params)
            else:
                # Create new progress
                progress_data['user_id'] = user_id
                progress_data['vocabulary_id'] = vocabulary_id
                
                fields = [k for k in progress_data.keys() if k != 'id']
                values = [progress_data[k] for k in fields]
                
                await db.execute(f"""
                    INSERT INTO user_progress ({', '.join(fields)})
                    VALUES ({', '.join(['?' for _ in fields])})
                """, values)
            
            await db.commit()
            
            # Return updated progress
            return await self.get_user_progress(user_id, vocabulary_id)
            
    async def get_user_learning_stats(self, user_id: int) -> Dict:
        """Get user's overall learning statistics"""
        async with aiosqlite.connect(self.db_path) as db:
            # Total vocabulary count for user
            cursor = await db.execute("""
                SELECT COUNT(DISTINCT vocabulary_id) 
                FROM user_progress 
                WHERE user_id = ?
            """, (user_id,))
            total_vocabulary = (await cursor.fetchone())[0]
            
            # Count by status
            cursor = await db.execute("""
                SELECT status, COUNT(*) as count
                FROM user_progress
                WHERE user_id = ?
                GROUP BY status
            """, (user_id,))
            
            status_counts = {row[0]: row[1] for row in await cursor.fetchall()}
            
            # Total reviews
            cursor = await db.execute("""
                SELECT SUM(review_count) 
                FROM user_progress 
                WHERE user_id = ?
            """, (user_id,))
            total_reviews = (await cursor.fetchone())[0] or 0
            
            # Calculate streak (days with reviews)
            cursor = await db.execute("""
                SELECT DATE(last_reviewed_at) as review_date
                FROM user_progress
                WHERE user_id = ? AND last_reviewed_at IS NOT NULL
                ORDER BY last_reviewed_at DESC
            """, (user_id,))
            
            review_dates = [row[0] for row in await cursor.fetchall()]
            streak_days = 0
            
            if review_dates:
                # Simple streak calculation
                from datetime import datetime, timedelta
                today = datetime.utcnow().date()
                current_date = today
                
                for date_str in review_dates:
                    review_date = datetime.fromisoformat(date_str).date()
                    if review_date == current_date or review_date == current_date - timedelta(days=1):
                        if review_date == current_date:
                            streak_days += 1
                        current_date = review_date - timedelta(days=1)
                    else:
                        break
            
            # Last review date
            cursor = await db.execute("""
                SELECT MAX(last_reviewed_at)
                FROM user_progress
                WHERE user_id = ?
            """, (user_id,))
            last_review = (await cursor.fetchone())[0]
            
            from app.models.progress import LearningStats
            return LearningStats(
                total_vocabulary=total_vocabulary,
                new_count=status_counts.get('new', 0),
                learning_count=status_counts.get('learning', 0),
                reviewing_count=status_counts.get('reviewing', 0),
                mastered_count=status_counts.get('mastered', 0),
                total_reviews=total_reviews,
                streak_days=streak_days,
                last_review_date=datetime.fromisoformat(last_review) if last_review else None
            ).dict()
            
    async def get_due_reviews(self, user_id: int, limit: int = 50) -> List[Dict]:
        """Get vocabulary items due for review"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            
            cursor = await db.execute("""
                SELECT 
                    v.*,
                    p.status,
                    p.review_count,
                    p.last_reviewed_at,
                    p.next_review_at
                FROM vocabulary_cache v
                JOIN user_progress p ON v.id = p.vocabulary_id
                WHERE p.user_id = ? 
                    AND p.status != 'mastered'
                    AND (p.next_review_at IS NULL OR p.next_review_at <= datetime('now'))
                ORDER BY p.next_review_at ASC, p.last_reviewed_at ASC
                LIMIT ?
            """, (user_id, limit))
            
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]
            
    async def create_batch_history(self, batch_id: str, user_id: int, total_urls: int) -> None:
        """Create a new batch processing history entry"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT INTO batch_processing_history (
                    id, user_id, total_urls, status, started_at
                ) VALUES (?, ?, ?, 'processing', CURRENT_TIMESTAMP)
            """, (batch_id, user_id, total_urls))
            await db.commit()
            
    async def update_batch_history(
        self, 
        batch_id: str, 
        successful: int, 
        failed: int, 
        status: str,
        results: List[Dict]
    ) -> None:
        """Update batch processing history"""
        async with aiosqlite.connect(self.db_path) as db:
            import json
            await db.execute("""
                UPDATE batch_processing_history
                SET successful = ?, failed = ?, status = ?, 
                    completed_at = CURRENT_TIMESTAMP, results = ?
                WHERE id = ?
            """, (successful, failed, status, json.dumps(results), batch_id))
            await db.commit()
            
    async def get_batch_history(self, user_id: int, limit: int = 10) -> List[Dict]:
        """Get user's batch processing history"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            
            cursor = await db.execute("""
                SELECT * FROM batch_processing_history
                WHERE user_id = ?
                ORDER BY started_at DESC
                LIMIT ?
            """, (user_id, limit))
            
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]
            
    async def get_batch_details(self, batch_id: str, user_id: int) -> Optional[Dict]:
        """Get detailed information about a specific batch"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            
            cursor = await db.execute("""
                SELECT * FROM batch_processing_history
                WHERE id = ? AND user_id = ?
            """, (batch_id, user_id))
            
            row = await cursor.fetchone()
            if row:
                result = dict(row)
                # Parse JSON results if present
                if result.get('results'):
                    import json
                    result['results'] = json.loads(result['results'])
                return result
            return None


# Global database service instance
db_service = DatabaseService()


async def init_db():
    """Initialize database (called on startup)"""
    await db_service.init_db()