"""
Migration: Add batch processing history and vocabulary enhancements
"""

NAME = "add_batch_history_and_vocabulary_enhancements"

UP = """
-- Create batch_processing_history table
CREATE TABLE IF NOT EXISTS batch_processing_history (
    id TEXT PRIMARY KEY,
    user_id INTEGER,
    total_urls INTEGER NOT NULL,
    successful INTEGER DEFAULT 0,
    failed INTEGER DEFAULT 0,
    status TEXT CHECK(status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    results TEXT, -- JSON string containing detailed results
    error_message TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indices for batch_processing_history
CREATE INDEX IF NOT EXISTS idx_batch_history_user_id ON batch_processing_history(user_id);
CREATE INDEX IF NOT EXISTS idx_batch_history_status ON batch_processing_history(status);
CREATE INDEX IF NOT EXISTS idx_batch_history_started_at ON batch_processing_history(started_at);

-- Update user_progress table to add more learning states
-- Note: SQLite doesn't support ALTER COLUMN, so we need to recreate the table
-- First, rename the existing table
ALTER TABLE user_progress RENAME TO user_progress_old;

-- Create new user_progress table with updated status values
CREATE TABLE user_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    vocabulary_id INTEGER NOT NULL,
    status TEXT CHECK(status IN ('new', 'learning', 'reviewing', 'mastered')) DEFAULT 'new',
    review_count INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    incorrect_count INTEGER DEFAULT 0,
    last_reviewed_at TIMESTAMP,
    next_review_at TIMESTAMP,
    easiness_factor REAL DEFAULT 2.5, -- For spaced repetition algorithm
    interval_days INTEGER DEFAULT 0,
    notes TEXT, -- User's personal notes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (vocabulary_id) REFERENCES vocabulary_cache(id) ON DELETE CASCADE,
    UNIQUE(user_id, vocabulary_id)
);

-- Copy data from old table to new table, mapping 'known' to 'mastered'
INSERT INTO user_progress (
    id, user_id, vocabulary_id, status, review_count, 
    last_reviewed_at, next_review_at, created_at, updated_at
)
SELECT 
    id, user_id, vocabulary_id, 
    CASE WHEN status = 'known' THEN 'mastered' ELSE status END,
    review_count, last_reviewed_at, next_review_at, 
    created_at, updated_at
FROM user_progress_old;

-- Drop the old table
DROP TABLE user_progress_old;

-- Recreate indices for user_progress
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_next_review ON user_progress(next_review_at);
CREATE INDEX IF NOT EXISTS idx_user_progress_status ON user_progress(status);
CREATE INDEX IF NOT EXISTS idx_user_progress_vocabulary_id ON user_progress(vocabulary_id);

-- Add batch_id column to vocabulary_cache for linking to batch processing
ALTER TABLE vocabulary_cache ADD COLUMN batch_id TEXT REFERENCES batch_processing_history(id);

-- Create index for batch_id
CREATE INDEX IF NOT EXISTS idx_vocabulary_cache_batch_id ON vocabulary_cache(batch_id);

-- Add export preferences to user_preferences table
ALTER TABLE user_preferences ADD COLUMN export_format TEXT DEFAULT 'json';
ALTER TABLE user_preferences ADD COLUMN include_examples_in_export BOOLEAN DEFAULT TRUE;
ALTER TABLE user_preferences ADD COLUMN include_difficulty_in_export BOOLEAN DEFAULT TRUE;
"""

DOWN = """
-- Drop indices
DROP INDEX IF EXISTS idx_vocabulary_cache_batch_id;
DROP INDEX IF EXISTS idx_user_progress_vocabulary_id;
DROP INDEX IF EXISTS idx_user_progress_status;
DROP INDEX IF EXISTS idx_user_progress_next_review;
DROP INDEX IF EXISTS idx_user_progress_user_id;
DROP INDEX IF EXISTS idx_batch_history_started_at;
DROP INDEX IF EXISTS idx_batch_history_status;
DROP INDEX IF EXISTS idx_batch_history_user_id;

-- Drop batch_processing_history table
DROP TABLE IF EXISTS batch_processing_history;

-- Revert user_progress table to original structure
ALTER TABLE user_progress RENAME TO user_progress_new;

CREATE TABLE user_progress (
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

-- Copy data back, mapping 'mastered' and 'reviewing' appropriately
INSERT INTO user_progress (
    id, user_id, vocabulary_id, status, review_count,
    last_reviewed_at, next_review_at, created_at, updated_at
)
SELECT 
    id, user_id, vocabulary_id,
    CASE 
        WHEN status = 'mastered' THEN 'known'
        WHEN status = 'reviewing' THEN 'learning'
        ELSE status 
    END,
    review_count, last_reviewed_at, next_review_at,
    created_at, updated_at
FROM user_progress_new;

DROP TABLE user_progress_new;

-- Recreate original indices
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_next_review ON user_progress(next_review_at);
CREATE INDEX IF NOT EXISTS idx_user_progress_status ON user_progress(status);

-- Note: Cannot easily remove columns from vocabulary_cache and user_preferences in SQLite
"""