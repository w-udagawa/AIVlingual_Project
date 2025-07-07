# CLAUDE.md - AIVlingual Development Guide

## Project Overview
AIVlingual is a revolutionary YouTube channel system that transforms ephemeral Vtuber content into permanent educational resources. The core innovation is converting "flow content" (Vtuber clips) into "stock content" (searchable language learning database).

### Key Achievements
- **Fully Functional Bilingual AI Vtuber Assistant** - AI character "Rin (りん)" responds naturally in Japanese/English based on user input with proper language detection and mixing (70/30 rule)
- **Complete User Authentication System** - JWT-based login/registration with user preferences
- **Settings Management** - User can customize language, AI response, and export preferences
- **Comprehensive E2E Testing** - Playwright-based testing framework with complete video analysis workflow testing
- **NLP-Enhanced Vocabulary Extraction** - spaCy integration with CEFR datasets for unlimited vocabulary extraction

## Development Commands

### Quick Start
```bash
# Backend (Windowsコマンドプロンプトで実行)
cd backend
conda activate aivlingual_py311
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend (別ターミナル)
cd frontend
npm run dev    # Frontend on port 3003
```

**重要**: 
- NLPを使用する場合、必ずWindowsコマンドプロンプトで実行（WSL2ではNLPが動作しません）
- `python -m uvicorn`形式で起動することで、正しいConda環境が使用されます

### Backend Commands
```bash
cd backend

# Environment Setup (Conda recommended)
conda create -n aivlingual_py311 python=3.11
conda activate aivlingual_py311
pip install -r requirements.txt
pip install -r requirements-nlp.txt
python -m spacy download en_core_web_sm
python -m spacy download ja_core_news_sm

# Development
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
python main.py  # Alternative with proper shutdown handling

# Testing
pytest                              # Run all tests
pytest -v                          # Verbose output
pytest tests/test_vocabulary_extractor.py::test_extract_expressions -v  # Single test
pytest tests/test_batch_processing.py
pytest tests/test_ai_responder.py
pytest tests/test_speech_processor.py

# Code Quality
black app/                         # Format code
mypy app/                         # Type checking
ruff check app/                   # Linting
```

### Frontend Commands
```bash
cd frontend

# Development
npm install                       # Install dependencies
npm run dev                      # Start dev server (port 3003)
npm run build                    # Build for production
npm run preview                  # Preview production build

# Testing
npm test                         # Run unit tests
npm run test:watch              # Watch mode
npm run test:coverage           # Coverage report

# E2E Testing (Playwright)
npm run test:e2e                # Run all E2E tests
npm run test:e2e:ui            # Run with UI mode
npm run test:e2e:headed        # Run with browser visible
npm run test:e2e:debug         # Debug mode
npx playwright test auth.spec.ts  # Run specific test
npx playwright test video-analysis.spec.ts --project=chromium

# Code Quality
npm run lint                    # Lint code
npm run type-check             # TypeScript checking
```

### Database Commands
```bash
# Run migrations
cd backend
python -m app.migrations.migration_runner

# Test database connection
python -c "from app.services.database_service import db_service; import asyncio; asyncio.run(db_service.init_db())"
```

## Architecture Overview

### Flow-to-Stock Pipeline
```
Vtuber Clip → Transcript → AI Analysis → Notion Database → Multi-format Export
                              ↓
                    SEO-optimized content → YouTube/Social Media
```

### Technology Stack
- **AI**: Gemini 2.0 Flash (ultra-low latency, streaming support)
- **Backend**: Python 3.11+, FastAPI, WebSocket, SQLite
- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Speech**: Web Speech API (browser-based, free)
- **Database**: SQLite (local) + Notion API (public)
- **Testing**: Pytest (backend), Jest + Playwright (frontend)
- **NLP**: spaCy + GiNZA (Japanese), CEFR datasets

### Project Structure
```
AIVlingual_Project/
├── backend/
│   ├── app/
│   │   ├── api/              # API endpoints & WebSocket handlers
│   │   │   └── v1/endpoints/
│   │   │       ├── auth.py   # Authentication endpoints
│   │   │       ├── vocabulary.py
│   │   │       └── youtube.py
│   │   ├── core/             # Business logic, AI integration
│   │   ├── services/         # External service integrations
│   │   │   ├── auth_service.py
│   │   │   ├── database_service.py
│   │   │   ├── export_service.py
│   │   │   └── nlp_vocabulary_extractor.py  # NLP-enhanced extraction
│   │   ├── models/           # Data models
│   │   │   └── user.py       # User authentication models
│   │   └── migrations/       # Database migrations
│   ├── scripts/              # Organized utility scripts
│   │   └── nlp_setup/       # NLP setup batch files
│   ├── tests/               # Backend unit tests
│   ├── logs/                # Application log files
│   └── test_outputs/        # Test export files
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── UserMenu.tsx
│   │   ├── contexts/         # React contexts
│   │   │   └── AuthContext.tsx
│   │   ├── pages/           # Page components
│   │   │   ├── LoginPage.tsx
│   │   │   ├── MainPage.tsx
│   │   │   └── SettingsPage.tsx
│   │   ├── services/         # API clients
│   │   │   └── authService.ts
│   │   └── obs/             # OBS-specific features
│   ├── e2e/                  # Playwright E2E tests
│   │   ├── fixtures/         # Test fixtures
│   │   ├── page-objects/     # Page Object Models
│   │   └── tests/           # Test specs
│   └── public/
├── docs/                     # Documentation
├── scripts/                  # Setup and startup scripts
└── tests/                    # Integration tests
```

## Critical Environment Variables

```bash
# backend/.env
GEMINI_API_KEY=your_key_here              # Required for AI responses
YOUTUBE_API_KEY=your_key_here            # For video analysis
NOTION_TOKEN=ntn_xxxx                    # For database sync
NOTION_DATABASE_ID=32_char_hex_no_dashes # e.g., 22104becf05280528c28c1a0505947ef

# Optional
STREAM_ENABLED=false                     # Streaming responses (disabled for stability)
AI_TEMPERATURE=0.7                       # AI creativity level
DATABASE_URL=sqlite:///./aivlingual.db   # Database location
JWT_SECRET_KEY=your_secret_key          # For authentication
```

## Common Development Tasks

### Running a Single Test
```bash
# Backend
pytest tests/test_vocabulary_extractor.py::test_extract_expressions -v

# Frontend E2E
npx playwright test video-analysis.spec.ts --project=chromium
```

### Testing Video Analysis
```bash
# Single video
curl "http://localhost:8000/api/v1/youtube/extract-vocabulary?url=https://youtu.be/VIDEO_ID"

# Batch processing
curl -X POST "http://localhost:8000/api/v1/youtube/batch-extract" \
  -H "Content-Type: application/json" \
  -d '{"urls": ["https://youtu.be/VIDEO1", "https://youtu.be/VIDEO2"]}'
```

### WebSocket Testing
```javascript
// Browser console
const ws = new WebSocket('ws://localhost:8000/ws/audio');
ws.onopen = () => ws.send(JSON.stringify({type: 'web_speech_result', text: 'Hello'}));
ws.onmessage = (e) => console.log('Response:', JSON.parse(e.data));
```

### NLP Extraction Testing
```bash
# Test NLP-enhanced extraction
cd tests
python test_nlp_extraction.py
```

## High-Level Architecture

### AI Response Pipeline
1. **User Input** → Web Speech API (browser) → WebSocket → Backend
2. **Language Detection** → Detects Japanese/English/Mixed with confidence scores
3. **AI Processing** → Gemini 2.0 Flash with character prompt (Rin/りん)
4. **Response Generation** → 70/30 language mixing based on input language
5. **TTS** → Browser speech synthesis with Japanese voice selection
6. **WebSocket Response** → Frontend display with typing animation

### Vocabulary Extraction Pipeline
1. **YouTube URL** → youtube-transcript-api → Extract captions
2. **NLP Processing** → spaCy extracts phrasal verbs, collocations, idioms
3. **Pattern Matching** → Detect Vtuber slang, expressions, grammar
4. **CEFR Level Assignment** → Automatic difficulty using Oxford 3000/5000
5. **AI Enhancement** → Gemini analyzes context and educational value
6. **Database Storage** → SQLite cache + Notion public database
7. **Export Options** → CSV, JSON, Anki deck formats

### WebSocket Message Flow
```javascript
// Client → Server
{
  type: 'web_speech_result',
  text: '今日は何を勉強しましょうか？',
  language: 'ja-JP',
  isFinal: true
}

// Server → Client
{
  type: 'ai_response',
  text: 'こんにちは！今日は人気Vtuberのクリップから...',
  language: 'ja',
  isComplete: true
}
```

### Authentication API
```javascript
// Login Request (注意: username_or_email フィールドを使用)
POST /api/v1/auth/login
{
  username_or_email: "test",  // username フィールドではない！
  password: "test0702"
}

// Login Response
{
  access_token: "eyJ...",     // token ではなく access_token
  token_type: "bearer",
  user: {
    id: 1,
    username: "test",
    email: "test@example.com",
    is_active: true,
    is_verified: false
  }
}

// Register Request
POST /api/v1/auth/register
{
  username: "test",
  email: "test@example.com",
  password: "test0702"
}
```

## Key Implementation Details

### Language Detection Logic
- Japanese detection: >30% Japanese characters → Japanese-primary response
- Mixed content: Significant presence of both languages
- Response mixing: 70% primary language, 30% secondary language

### NLP Extraction Features
- **spaCy Integration**: Phrasal verbs, collocations, named entities
- **CEFR Datasets**: Automatic difficulty assignment (A1-C2)
- **Redis Caching**: 24-hour TTL for processed videos
- **Hybrid Approach**: Pattern matching + NLP + AI enhancement

### Rate Limiting
- Gemini API: 60 requests/minute per client
- YouTube API: 10,000 units/day quota
- WebSocket: 1 message/second per client

### Error Recovery
- AI response timeout: 30 seconds with automatic reset
- WebSocket reconnection: Exponential backoff
- TTS fallback: Multiple voice options with quality preference

### Database Schema
- **vocabulary** table: Stores extracted expressions with metadata
- **vocabulary_cache**: YouTube video analysis results  
- **users**: Authentication and preferences
- **user_vocabulary**: User-specific vocabulary tracking
- **user_settings**: Language preferences and export options

## Testing Guidelines

### E2E Test Structure
```
frontend/e2e/
├── fixtures/test-base.ts      # Custom fixtures & auth helpers
├── page-objects/              # Page Object Models
│   ├── HomePage.ts
│   ├── VideoAnalysisPage.ts
│   └── VocabularyPage.ts
└── tests/                     # Test specifications
    ├── auth.spec.ts          # Authentication flows
    ├── video-analysis.spec.ts # YouTube analysis
    └── websocket.spec.ts     # Real-time features
```

### Running E2E Tests
```bash
# Ensure backend and frontend are running
cd backend && python main.py &
cd frontend && npm run dev &

# Run tests
cd frontend
npm run test:e2e              # Headless mode
npm run test:e2e:ui          # Interactive UI
npx playwright test --debug   # Debug specific test
```

## Troubleshooting

### Common Issues
1. **"AIが考えています..." stuck**: Check GEMINI_API_KEY and WebSocket connection
2. **Japanese TTS issues**: Verify browser has Japanese voices installed
3. **WebSocket errors**: Check CORS settings include port 3003
4. **Database errors**: Run migrations with `python -m app.migrations.migration_runner`
5. **E2E test failures**: Ensure test data is clean, run with `--headed` to debug
6. **Login returns 422 error**: 
   - Ensure using `username_or_email` field (not `username`) in login request
   - Check response expects `access_token` (not `token`)
7. **React-hot-toast test failures**: Use `[role="status"]` selector with filter for specific text
8. **API endpoint `/api/v1/youtube/analyze` not found**: 
   - Use `/api/v1/youtube/extract-vocabulary` instead
   - Update API config mapping in frontend services
9. **Data field mapping errors in video analysis**:
   - API returns `japanese_text`/`english_text`, frontend expects `japanese`/`english`
   - API returns `channel_title`/`thumbnail_url`, frontend expects `channel`/`thumbnail`
   - Implement data transformation in YouTubeService
10. **React component errors**: `Cannot read properties of undefined (reading 'length')`
    - Add optional chaining: `vocabulary_items?.length`
    - Check for undefined before accessing nested properties
11. **authenticatedPage fixture not found in E2E tests**:
    - Replace with loginPage fixture and manual login flow
    - Update test beforeEach hooks to handle authentication
12. **NLP not working (only 3 vocabulary items extracted)**:
    - **最重要**: Windowsコマンドプロンプトで実行しているか確認（WSL2では動作しません）
    - 正しい起動方法: `python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
    - `/api/v1/youtube/debug-env`で環境を確認
    - 詳細は `/docs/NLP_TROUBLESHOOTING_GUIDE.md` を参照

### Debug Commands
```bash
# Check API keys
python -c "from app.core.config import settings; print(f'Gemini: {settings.GEMINI_API_KEY[:10]}...')"

# Test WebSocket
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost:8000/ws/audio

# View logs
tail -f backend/logs/backend.log
tail -f frontend/logs/frontend.log

# Test NLP functionality
cd backend
conda activate aivlingual_py311
python -c "import spacy; nlp = spacy.load('ja_core_news_sm'); print('Japanese NLP ready')"
```

## Recent Major Changes

### 2025-01-10
- **NLP Extraction Fix**: Resolved issue where only 3-5 vocabulary items were extracted due to WSL2/Conda environment mismatch
- **Vocabulary Quality Improvements**: Enhanced filtering to exclude A1 level words, improved collocation quality, added VTuber/gaming expressions
- **Troubleshooting Guide**: Created comprehensive NLP troubleshooting documentation
- **Startup Method Update**: Clarified that backend must run in Windows Command Prompt with Conda environment

### 2025-07-05
- **NLP Environment Setup**: Configured Miniconda with Python 3.11 for spaCy compatibility
- **Japanese Model Integration**: Integrated ja_core_news_sm for Japanese NLP processing
- **Project Reorganization**: Cleaned up scripts, moved to organized directory structure
- **Improved Error Handling**: Fixed pydantic/spaCy version conflicts

### 2025-07-03
- **NLP-Enhanced Vocabulary Extraction**: Implemented spaCy integration with CEFR datasets for unlimited vocabulary extraction
- **Hybrid Extraction Architecture**: 3-layer system combining spaCy NLP, CEFR datasets, and Gemini AI
- **Intelligent Caching**: Redis-based caching with 24-hour TTL and memory fallback
- **Multi-word Expression Detection**: Automatic detection of phrasal verbs, idioms, and collocations
- **CEFR Level Assignment**: Automatic difficulty assignment using Oxford 3000/5000 datasets

### 2025-07-02
- **Comprehensive E2E Testing Framework**: Implemented Playwright testing with fixtures, Page Object Models, and complete video analysis workflow testing
- **API Endpoint Corrections**: Fixed missing `/api/v1/youtube/analyze` endpoint mapping to `/extract-vocabulary`
- **Data Mapping Resolution**: Resolved API response field mismatches between backend and frontend
- **Component Error Handling**: Added optional chaining and proper null checks for React components
- **Authentication System Fixes**: Resolved login credential validation (6-char minimum password) and JWT token handling
- **CORS Enhancement**: Updated configuration to support multiple frontend ports (3003, 3004)
- **User Authentication System**: Added JWT-based login/registration with user preferences
- **Multi-format Export**: Created CSV, JSON, and Anki deck export functionality
- **WebSocket Optimization**: Fixed message handling and language detection issues
- **TTS Enhancement**: Proper Japanese voice selection and pronunciation
- **Settings Management**: User preferences and form validation with onBlur events

### Architecture Decisions
- **Gemini 2.0 Flash**: Chosen for <1s latency and free tier
- **Web Speech API**: Zero-cost browser-based speech recognition
- **Vite + React**: Fast development with HMR
- **SQLite + Notion**: Local performance + public SEO benefits
- **Playwright**: Cross-browser E2E testing with visual debugging
- **spaCy + GiNZA**: Advanced NLP for unlimited vocabulary extraction
- **CEFR Datasets**: Standardized difficulty levels for language learners

---

**Remember**: This project transforms entertainment into education. Every Vtuber clip processed creates permanent learning value! 🚀