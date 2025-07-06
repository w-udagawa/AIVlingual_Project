"""
Migration: Add user authentication tables
"""

NAME = "add_user_authentication"

UP = """
-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_sessions table for auth tokens
CREATE TABLE IF NOT EXISTS user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add user_id to vocabulary_cache table
ALTER TABLE vocabulary_cache ADD COLUMN user_id INTEGER REFERENCES users(id);

-- Add user_id to sessions table if not exists
ALTER TABLE sessions ADD COLUMN authenticated_user_id INTEGER REFERENCES users(id);

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_vocabulary_cache_user_id ON vocabulary_cache(user_id);

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    language_preference TEXT DEFAULT 'auto',
    difficulty_preference INTEGER DEFAULT 3,
    daily_goal INTEGER DEFAULT 10,
    notification_enabled BOOLEAN DEFAULT TRUE,
    theme TEXT DEFAULT 'light',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create user_progress table
CREATE TABLE IF NOT EXISTS user_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    vocabulary_id INTEGER NOT NULL,
    status TEXT CHECK(status IN ('new', 'learning', 'known')) DEFAULT 'new',
    review_count INTEGER DEFAULT 0,
    last_reviewed_at TIMESTAMP,
    next_review_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (vocabulary_id) REFERENCES vocabulary_cache(id) ON DELETE CASCADE,
    UNIQUE(user_id, vocabulary_id)
);

-- Create indices for user progress
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_next_review ON user_progress(next_review_at);
CREATE INDEX IF NOT EXISTS idx_user_progress_status ON user_progress(status);
"""

DOWN = """
-- Drop indices
DROP INDEX IF EXISTS idx_user_progress_status;
DROP INDEX IF EXISTS idx_user_progress_next_review;
DROP INDEX IF EXISTS idx_user_progress_user_id;
DROP INDEX IF EXISTS idx_vocabulary_cache_user_id;
DROP INDEX IF EXISTS idx_user_sessions_user_id;
DROP INDEX IF EXISTS idx_user_sessions_token;
DROP INDEX IF EXISTS idx_users_username;
DROP INDEX IF EXISTS idx_users_email;

-- Drop tables
DROP TABLE IF EXISTS user_progress;
DROP TABLE IF EXISTS user_preferences;
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS users;

-- Note: Cannot easily remove columns from vocabulary_cache and sessions in SQLite
-- Would need to recreate tables without the user_id columns
"""