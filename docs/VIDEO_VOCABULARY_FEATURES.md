# AIVlingual Video Analysis & Vocabulary Database Features

## Overview
This document describes the video analysis and vocabulary database features implemented for the AIVlingual project.

## Features Implemented

### 1. Video Analysis with YouTube Integration

#### YouTube Service Enhancements
- **YouTube Data API Integration**: Rich metadata retrieval including:
  - Video title, description, channel information
  - View count, like count, comment count
  - Published date and tags
  - Video duration parsing
  - Thumbnail URLs

- **Channel Video Retrieval**: Get recent videos from specific Vtuber channels
- **Video Search**: Search functionality with Vtuber content filtering
- **Transcript Extraction**: Multi-language transcript support (Japanese/English)
- **Expression Detection**: Pattern-based detection of:
  - Vtuber slang (てぇてぇ, ぽんこつ, etc.)
  - Internet slang (草, スパチャ, etc.)
  - Common Japanese expressions

#### API Endpoints
```
GET /api/v1/youtube/extract-vocabulary?url={youtube_url}
GET /api/v1/youtube/search?q={query}
GET /api/v1/youtube/channel/{channel_id}/videos
GET /api/v1/youtube/video/{video_id}/info
POST /api/v1/youtube/batch-extract
GET /api/v1/youtube/batch-status/{batch_id}
```

### 2. User Authentication System

#### Database Schema
- **Users Table**: User account management
- **User Sessions**: Token-based authentication
- **User Preferences**: Language, difficulty, daily goals
- **User Progress**: Vocabulary learning tracking

#### Authentication Features
- User registration and login
- JWT token-based sessions
- Password hashing with bcrypt
- User preferences management

#### API Endpoints
```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
GET /api/v1/auth/me
GET /api/v1/auth/preferences
PUT /api/v1/auth/preferences
```

### 3. Enhanced Vocabulary Database

#### Multi-User Support
- User-specific vocabulary lists
- Personal learning progress tracking
- Shared global vocabulary pool

#### Database Enhancements
- Migration system for schema updates
- User ID association with vocabulary items
- Learning progress tracking per user

### 4. Vocabulary Export Functionality

#### Export Formats
1. **CSV Export**
   - Excel-compatible UTF-8 with BOM
   - All vocabulary fields included
   - Filterable by difficulty and user

2. **Anki Deck Export (APKG)**
   - Complete Anki package generation
   - Custom card styling for Japanese learning
   - Front: Japanese text with reading and context
   - Back: English translation with difficulty level
   - Source video links with timestamps

3. **JSON Export**
   - Complete data export for backup
   - Structured format for programmatic use

#### API Endpoints
```
GET /api/v1/vocabulary/export/csv
GET /api/v1/vocabulary/export/anki
GET /api/v1/vocabulary/export/json
```

## Testing

### Test Scripts Created
1. **test_video_analysis.py**: Unit tests for video processing
2. **test_integration_video_vocabulary.py**: Full integration testing
3. **test_ai_conversation_flow.js**: Enhanced with WebSocket optimizations

### Test Coverage
- YouTube service functionality
- Vocabulary extraction from videos
- User authentication flow
- Database operations
- Export functionality
- API endpoint validation

## Configuration

### Required Environment Variables
```
YOUTUBE_API_KEY=your_youtube_api_key
GEMINI_API_KEY=your_gemini_api_key
DATABASE_URL=sqlite:///./aivlingual.db
SECRET_KEY=your_secret_key_for_jwt
```

### Database Migrations
Run migrations on startup to ensure schema is up to date:
```python
# Automatically handled in database_service.init_db()
```

## Usage Examples

### Extract Vocabulary from YouTube Video
```python
# Using the API
response = requests.get(
    "http://localhost:8000/api/v1/youtube/extract-vocabulary",
    params={"url": "https://www.youtube.com/watch?v=VIDEO_ID"},
    headers={"Authorization": f"Bearer {token}"}
)
```

### Export Vocabulary to Anki
```python
# Export user's vocabulary as Anki deck
response = requests.get(
    "http://localhost:8000/api/v1/vocabulary/export/anki",
    params={
        "difficulty_level": 3,
        "limit": 500,
        "deck_name": "My Vtuber Vocabulary"
    },
    headers={"Authorization": f"Bearer {token}"}
)

# Save the .apkg file
with open("my_vocabulary.apkg", "wb") as f:
    f.write(response.content)
```

### Search for Vtuber Videos
```python
# Search with automatic Vtuber filtering
response = requests.get(
    "http://localhost:8000/api/v1/youtube/search",
    params={"q": "日本語勉強", "max_results": 20}
)
```

## Performance Optimizations

1. **WebSocket Connection**: Optimized from 32+ seconds to under 5 seconds
2. **Batch Processing**: Support for processing multiple videos
3. **Database Indexing**: Optimized queries with proper indices
4. **Caching**: 15-minute cache for repeated API calls

## Security Features

1. **Authentication**: Token-based authentication for user-specific data
2. **Password Security**: Bcrypt hashing with salt
3. **Session Management**: Expiring tokens with renewal
4. **Input Validation**: Pydantic models for all inputs

## Future Enhancements

1. **Spaced Repetition Algorithm**: Implement SRS for vocabulary review
2. **Social Features**: Share vocabulary lists between users
3. **Advanced Analytics**: Learning progress visualization
4. **Mobile App Support**: API ready for mobile clients
5. **Twitch Integration**: Support for Twitch VODs and clips