# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AIVlingual is a revolutionary YouTube channel system that transforms ephemeral Vtuber content into permanent educational resources. The core innovation is converting "flow content" (Vtuber clips) into "stock content" (searchable language learning database).

### 🎯 Key Achievement (2025-07-02)
**Fully Functional Bilingual AI Vtuber Assistant**
- AI character "Rin (りん)" responds naturally in Japanese/English based on user input
- Proper language detection and mixing (70/30 rule)
- Japanese voice synthesis working correctly
- Real-time conversation with Vtuber culture knowledge
- Educational vocabulary extraction from clips

### 📄 Related Documentation
- **DEVELOPMENT_NOTES.md**: Development environment specs and reference repositories
- **USER_GUIDE.md**: Complete guide for non-engineers
- **BUSINESS_MODEL.md**: Revenue strategy and growth plan
- **TODO.md**: Implementation roadmap

### 🚀 Latest Updates (2025-07-02)

#### AI Response System Complete Overhaul
- **Fixed "AIが考えています..." infinite loading**: Resolved WebSocket message handling issues
- **Language Detection Enhancement**: Implemented `_detect_user_language` method for accurate Japanese/English detection
- **Japanese-First Response Logic**: Fixed response language mixing - Japanese questions now get 70% Japanese responses
- **TTS Language Correction**: Fixed issue where Japanese text was being read with English pronunciation
- **Character Identity**: AI assistant now properly introduces herself as "Rin (りん)"

#### Technical Improvements
- **Streaming Toggle**: Temporarily disabled streaming (`STREAM_ENABLED=false`) for stability
- **Debug Logging**: Added comprehensive WebSocket message logging for easier debugging
- **Error Recovery**: Added 30-second timeout for AI response with automatic state reset
- **Voice Selection**: Implemented intelligent Japanese voice selection for TTS (prefers Google Japanese voices)

#### Component Updates
- **ChatDisplay.tsx**: Enhanced with streaming support handlers and timeout management
- **WebSocketContext.tsx**: Added detailed logging and improved message parsing
- **StreamingMessage.tsx**: New component for future streaming UI (created but not yet integrated)
- **WebSpeechSynthesis.ts**: Enhanced voice selection logic for better Japanese pronunciation

### 🚀 Previous Updates (2025-07-02 Morning)

- **Frontend Port Configuration**: Fixed port conflicts and updated to use port 3003
- **WebSpeechInterface Fix**: Resolved circular dependency in useCallback hooks
- **WebSocketContext Enhancement**: Added missing `isConnecting` property
- **Startup Script Update**: Fixed port mismatch in start_aivlingual_no_venv.bat
- **UI Components**: Successfully integrated mic button with proper animations

### 🚀 Previous Updates (2025-06-30)

- **Gemini 2.0 Flash Integration**: Upgraded to production model with streaming support
- **Web Speech API Enhancement**: Advanced language detection and state management
- **Improved Error Handling**: Comprehensive error recovery and user-friendly messages
- **Real-time Streaming**: Implemented streaming AI responses for better UX

### 🎯 Core Concept: "Creating Lasting Value"

```
Traditional Vtuber Clip Channel:
Video Upload → Watch → Forgotten (Flow)

AIVlingual:
Video Upload → Watch → Database Creation → Permanent Learning Resource (Stock)
                ↓
          Public Notion DB → Search Traffic → Channel Discovery
```

## AI Character Profile

### Rin (りん) - AIVlingual Virtual Assistant

- **Name**: Rin (りん)
- **Role**: Bilingual AI Vtuber assistant specializing in Japanese language learning through Vtuber culture
- **Personality**: Energetic, supportive, and knowledgeable about Vtuber culture
- **Language Style**:
  - Japanese input → 70% Japanese response with 30% English explanations
  - English input → 70% English response with 30% Japanese vocabulary teaching
  - Never uses romaji - always proper Japanese characters
- **Special Features**:
  - Recognizes and explains Vtuber slang (てぇてぇ, ぽんこつ, 草, etc.)
  - Provides vocabulary with format: [Word | Reading | Meaning | Difficulty]
  - References popular Vtubers (e.g., 宝鐘マリン from Hololive)

## Business Model

The system monetizes through multiple layers:
1. **YouTube Revenue**: Ad revenue, SuperChat, memberships
2. **Database Value**: SEO traffic, affiliate links, premium features
3. **Community**: Discord, coaching, group lessons

## Technical Architecture

### Current Stack (MVP Phase)

1. **AI Core**
   - Gemini 2.0 Flash (production model, ultra-low latency <1s)
   - Streaming response support for real-time interaction
   - Advanced prompt optimization for Vtuber content
   - Web Speech API (free browser-based recognition)

2. **Backend API (Python/FastAPI)**
   - WebSocket server with streaming support
   - Advanced language detection (Japanese/English/Mixed)
   - Speech recognition state management
   - Rate limiting for API protection
   - Automated clip analysis pipeline
   - Notion API integration for database creation
   - YouTube API for content management
   - Batch processing for multiple videos

3. **Frontend (Next.js 14)**
   - OBS browser source integration (5 view modes)
   - Real-time subtitles and overlays
   - Database management interface
   - Analytics dashboard
   - Batch processing UI with progress tracking

4. **Content Pipeline**
   ```
   Vtuber Clip → Transcript Extraction → Expression Analysis →
   → Notion DB Entry → SEO Optimization → Multi-format Export
   ```

5. **OBS Integration**
   - Browser source views (subtitle, chat, educational, avatar, analysis)
   - Real-time WebSocket updates
   - Customizable themes and positions
   - Avatar state animations with static PNGs

## Development Commands

### Initial Setup
```bash
# Clone and setup
git clone [repository-url]
cd AIVlingual_Project

# Linux/Mac
./setup.sh

# Windows
./setup.bat
```

### Backend Development
```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Start development server
uvicorn app.main:app --reload

# Run tests
pytest

# Format code
black app/

# Type checking
mypy app/

# Linting
ruff check app/
```

### Frontend Development
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

### OBS Testing
```bash
# Start backend and frontend first
# Then open test page in browser:
open test_obs_views.html

# Generate placeholder avatars:
open create_placeholder_avatars.html
# Download and place in frontend/public/avatars/
```

## Project Structure (Refactored)

```
AIVlingual_Project/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── v1/                # API version 1
│   │   │   │   ├── router.py      # Main API router
│   │   │   │   └── endpoints/     # Modular endpoints
│   │   │   │       ├── health.py
│   │   │   │       ├── vocabulary.py
│   │   │   │       ├── youtube.py
│   │   │   │       └── conversation.py
│   │   │   └── websocket/         # WebSocket handlers
│   │   │       └── handlers/      # Message handlers
│   │   │           ├── audio_handler.py
│   │   │           ├── control_handler.py
│   │   │           └── web_speech_handler.py
│   │   ├── core/                  # Business logic
│   │   │   ├── ai_responder.py   # Gemini 2.0 Flash integration
│   │   │   ├── rate_limiter.py   # Token bucket rate limiting
│   │   │   └── config.py         # Configuration
│   │   ├── models/                # Data models
│   │   └── services/              # External integrations
│   │       ├── language_detector.py    # Advanced language detection
│   │       └── speech_recognition_manager.py  # Session state management
│   └── tests/
│       ├── test_gemini_integration.py
│       └── test_web_speech_integration.py
├── frontend/
│   ├── src/
│   │   ├── components/            # React components
│   │   │   ├── ui/               # UI components
│   │   │   ├── features/         # Feature components
│   │   │   └── StreamingMessage.tsx  # Streaming AI response UI (ready for integration)
│   │   ├── contexts/             # React contexts
│   │   │   └── WebSocketContext.tsx  # Enhanced with debug logging
│   │   ├── hooks/               # Custom hooks
│   │   ├── services/            # API services
│   │   ├── obs/                 # OBS browser sources
│   │   │   └── views/          # 5 OBS view modes
│   │   ├── types/              # TypeScript types
│   │   ├── utils/              # Utility functions
│   │   └── constants/          # App constants
│   └── public/
│       └── avatars/            # Avatar PNG images
├── PROJECT_STRUCTURE.md         # Detailed structure documentation
├── test_obs_views.html         # OBS testing interface
└── create_placeholder_avatars.html  # Avatar generator
```

See PROJECT_STRUCTURE.md for detailed structure information.

## Key Features & Implementation Status

### ✅ 1. Gemini 2.0 Flash Integration (Phase 2.5 - Complete)

```python
# Ultra-low latency AI with streaming support
class BilingualAIResponder:
    async def generate_response_stream(
        self,
        user_input: str,
        detected_language: str,
        session_context: Optional[Dict] = None,
        client_id: str = "default"
    ) -> AsyncIterator[Dict]:
        # Streaming chunks for real-time response
        # Optimized prompts for Vtuber content
        # Rate limiting to prevent abuse
```

### ✅ 2. Web Speech API Integration (Phase 2.6 - Complete)

```python
# Advanced language detection and state management
class LanguageDetector:
    def detect_language(self, text: str, browser_hint: Optional[str] = None) -> Tuple[str, float]:
        # Detects Japanese, English, or Mixed (common in Vtuber content)
        # Returns confidence score for accuracy

class SpeechRecognitionManager:
    # Comprehensive session state tracking
    # Error recovery and statistics
    # Automatic cleanup of inactive sessions
```

### ✅ 3. Automated Vocabulary Database Creation (Implemented)

```python
class VocabularyExtractor:
    """Core system for converting video content to database entries"""
    
    async def process_vtuber_clip(self, video_url: str):
        # Extract transcript with timestamps
        transcript = await self.get_transcript(video_url)
        
        # Identify valuable expressions using patterns
        expressions = self.extract_learning_points(transcript)
        
        # Create rich database entries
        for expr in expressions:
            await self.create_notion_entry({
                "japanese_text": expr.original,
                "english_text": expr.translation,
                "context": expr.usage_context,
                "difficulty_level": expr.difficulty_level,
                "video_timestamp": expr.timestamp,
                "source_video_id": expr.video_id
            })
```

### ✅ 4. Real-time WebSocket Communication

```typescript
// Ultra-low latency conversation with reconnection logic
const websocket = new WebSocket('ws://localhost:8000/ws/audio')

// Keepalive mechanism (30 second ping)
setInterval(() => {
  if (websocket.readyState === WebSocket.OPEN) {
    websocket.send(JSON.stringify({ type: 'ping' }))
  }
}, 30000)
```

### ✅ 5. YouTube Transcript Extraction

- Uses youtube-transcript-api v1.1.0
- Extracts Vtuber-specific expressions
- Pattern matching for slang and internet terms

### ✅ 6. Batch Video Processing (Implemented)

```python
# Backend endpoint for batch processing
@api_router.post("/youtube/batch-extract")
async def batch_extract_vocabulary(request: BatchExtractRequest):
    batch_id = f"batch_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
    asyncio.create_task(_process_batch(batch_id, request.urls))
    return {"batch_id": batch_id, "total_urls": len(request.urls)}

# Frontend component with real-time progress
<BatchProcessor 
  onProcessComplete={(results) => console.log('Batch complete:', results)}
/>
```

### ✅ 7. OBS Browser Source Integration (Phase 3.1 Complete)

```typescript
// Available OBS views via URL parameters
// http://localhost:3000/obs?mode=subtitle&position=bottom&fontSize=24

interface OBSConfig {
  mode: 'subtitle' | 'chat' | 'educational' | 'avatar' | 'analysis'
  fontSize?: number
  position?: 'top' | 'bottom'
  theme?: 'dark' | 'light' | 'transparent'
  maxMessages?: number
}
```

### OBS View Modes

1. **Subtitle View**: Clean subtitles for streaming
   - Customizable position (top/bottom)
   - Adjustable font size
   - Theme options (dark/light/transparent)

2. **Chat View**: Message history display
   - Shows conversation flow
   - Timestamps and speakers
   - Auto-scroll with max message limit

3. **Educational View**: Language learning overlay
   - Japanese text with furigana
   - English translations
   - Difficulty indicators

4. **Avatar View**: Animated character display
   - Static PNG with CSS animations
   - State-based expressions (idle, speaking, thinking, etc.)
   - Smooth transitions between states

5. **Analysis View**: Real-time vocabulary extraction
   - Shows detected expressions
   - Difficulty ratings
   - Context information

### 🚧 8. Scene Automation (Phase 3.2 - Pending)

- Automatic scene switching based on content
- Educational moment detection
- Clip-worthy moment marking

## Environment Variables

### Critical API Keys (Required)

```bash
# backend/.env
GEMINI_API_KEY=your_key_here  # Required for AI responses
NOTION_TOKEN=ntn_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # 32 char hex, no dashes
YOUTUBE_API_KEY=AIzaXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Optional but recommended
STREAM_ENABLED=true  # Enable streaming AI responses
AI_TEMPERATURE=0.7   # Control AI creativity (0.0-1.0)
MAX_CONVERSATION_TURNS=10  # Conversation history limit
```

#### Getting API Keys:
- **GEMINI_API_KEY**: https://makersuite.google.com/app/apikey (FREE)
- **NOTION_TOKEN**: https://www.notion.so/my-integrations (FREE)
- **YOUTUBE_API_KEY**: https://console.cloud.google.com/ (FREE with quotas)

### Optional Services

```bash
AZURE_SPEECH_KEY=your_key_here  # For high-quality STT
OBS_WEBSOCKET_PASSWORD=your_password  # For OBS automation
```

## Database Schema

### Vocabulary Table
```sql
CREATE TABLE vocabulary (
    id TEXT PRIMARY KEY,
    japanese_text TEXT NOT NULL,
    english_text TEXT NOT NULL,
    reading TEXT,
    difficulty_level INTEGER DEFAULT 3,  -- 1-5 scale
    context TEXT,
    example_sentence TEXT,
    tags TEXT,  -- JSON array
    source TEXT,  -- 'youtube', 'conversation', etc.
    source_video_id TEXT,
    video_timestamp REAL,
    notion_id TEXT,
    created_at TIMESTAMP,
    synced_at TIMESTAMP
);
```

## Common Issues & Solutions

### AI Response Not Showing / "AIが考えています..." Stuck
```javascript
// Solution 1: Check WebSocket connection in console
// Look for: "WebSocket message received:" logs

// Solution 2: Verify backend is processing
// Check backend logs for: "Detected user language: ja-JP"

// Solution 3: Temporarily disable streaming
// In backend/.env: STREAM_ENABLED=false
```

### Japanese Text Read with English Pronunciation
```javascript
// Solution: TTS language detection fixed
// Console should show: "Selected voice: Google 日本語 (ja-JP)"
// If not, check available voices in browser
```

### AI Responds in Wrong Language Mix
```python
# Solution: Language detection threshold adjusted
# Japanese input (>30% Japanese chars) → Japanese-primary response
# Check backend logs: "Detected user language: ja-JP"
```

### WebSocket Connection Failed
```bash
# Check if backend is running
curl http://localhost:8000/health

# Verify CORS settings include your port
# backend/app/core/config.py should have:
CORS_ORIGINS = ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"]
```

### Gemini API Rate Limiting
```python
# Error: 429 Too Many Requests
# Solution: Rate limiter is automatically configured
# Adjust in backend/app/core/rate_limiter.py:
RATE_LIMIT_REQUESTS = 60  # Requests per minute
RATE_LIMIT_TOKENS = 1000000  # Tokens per minute
```

### Language Detection Issues
```python
# Mixed language not detected properly
# Solution: Check confidence threshold in language_detector.py
MIXED_THRESHOLD = 0.3  # Lower = more sensitive to mixed content
```

### WebSocket Disconnect Errors
```python
# Fixed by checking message type before processing:
if message.get("type") == "websocket.disconnect":
    logger.info(f"Received disconnect message from {client_id}")
    break
```

### YouTube Transcript API Errors
```bash
# Solution: Upgrade to v1.1.0
pip install youtube-transcript-api==1.1.0

# Common error: "no element found: line 1, column 0"
# This means the video has no captions available
```

### API Parameter Validation Errors
```javascript
// Filter undefined values before sending:
const params = Object.fromEntries(
  Object.entries({ limit, difficulty, search })
    .filter(([_, v]) => v !== undefined)
)
```

### Pydantic Model Errors in Tests
```python
# Error: Cannot set arbitrary attributes on Pydantic models
# Solution: Use SimpleNamespace for mock objects
from types import SimpleNamespace

mock_response = SimpleNamespace(
    json=lambda: {"items": [{"id": "abc123"}]}
)
```

### React Router Issues
```javascript
// Error: useSearchParams not available
// Solution: Use native URLSearchParams
const searchParams = new URLSearchParams(window.location.search)
const mode = searchParams.get('mode') || 'subtitle'
```

### OBS Browser Source Issues
```bash
# Browser source shows blank
# Solution 1: Check WebSocket connection in browser console
# Solution 2: Verify CORS allows OBS browser (usually file://)
# Solution 3: Use test_obs_views.html to debug

# Avatar images not showing
# Solution: Place PNG files in frontend/public/avatars/
# Files needed: idle.png, listening.png, thinking.png, speaking.png, excited.png, confused.png
```

### Gemini API Errors
```python
# Error: API key expired
# Solution: Generate new key at https://makersuite.google.com/app/apikey

# Error: Rate limit exceeded
# Solution: Implement exponential backoff or use free tier limits
```

### Notion Sync Issues
```bash
# Database ID format: 32 character hex string, NO dashes
# Wrong: 22104bec-f052-8052-8c28-c1a0505947ef
# Right: 22104becf05280528c28c1a0505947ef

# Test connection:
curl -X GET https://api.notion.com/v1/databases/{database_id} \
  -H "Authorization: Bearer {token}" \
  -H "Notion-Version: 2022-06-28"
```

## Architecture Decisions

### Core Technology Choices

#### Gemini 2.0 Flash (Primary AI)
- **Why**: Ultra-low latency (< 1 second) with streaming support
- **Model**: gemini-2.0-flash (production, not experimental)
- **Cost**: FREE tier with 60 RPM limit
- **Features**: 
  - Streaming responses for real-time interaction
  - Optimized prompts for Vtuber/anime content
  - Built-in rate limiting protection
- **Alternative considered**: GPT-4 (too expensive)

#### Web Speech API (Primary STT)
- **Why**: Completely FREE, browser-native, real-time
- **Features**:
  - Advanced language detection (Japanese/English/Mixed)
  - Session state management
  - Error recovery with user-friendly messages
  - Interim and final transcript handling
- **Limitation**: Chrome/Edge only
- **Backup**: Azure Speech for production quality

#### Notion API (Database)
- **Why**: Public databases for SEO
- **Cost**: FREE
- **Benefit**: Built-in web interface

### Architecture Principles

1. **Cost-First Design**
   - Use free tiers wherever possible
   - Local processing when feasible
   - Pay-per-use only when necessary

2. **Flow-to-Stock Pipeline**
   - Every stream creates permanent value
   - Automated content multiplication
   - SEO-optimized outputs

3. **Creator-Centric**
   - Single-user optimization
   - OBS-first interface design
   - Clip-friendly outputs

## Vtuber Expression Patterns

The system recognizes these patterns:

```python
vtuber_patterns = [
    (r'(てぇてぇ|てえてえ)', 'precious/wholesome', 'vtuber_slang'),
    (r'(ぽんこつ|ポンコツ)', 'clumsy/airhead', 'vtuber_slang'),
    (r'(草|くさ|ｗｗｗ)', 'lol/laughing', 'internet_slang'),
    (r'(おつかれ|お疲れ)', 'good work/bye', 'common'),
    (r'(スパチャ|スーパーチャット)', 'super chat donation', 'vtuber_slang'),
]
```

## Testing Strategy

### Backend Tests
```bash
cd backend
pytest                    # Run all tests
pytest -v                 # Verbose output
pytest tests/test_vocabulary_extractor.py  # Specific test
pytest tests/test_batch_processing.py     # Batch processing tests
pytest tests/test_gemini_integration.py    # Gemini 2.0 Flash tests
pytest tests/test_web_speech_integration.py # Web Speech API tests
```

### Frontend Tests
```bash
cd frontend
npm test                  # Run Jest tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
```

### Manual Testing

1. **WebSocket Connection**
   ```bash
   # Start backend
   cd backend && uvicorn app.main:app --reload
   
   # Start frontend
   cd frontend && npm run dev
   
   # Check WebSocket tab in browser DevTools
   ```

2. **YouTube Extraction**
   ```bash
   # Test single video
   curl "http://localhost:8000/api/v1/youtube/extract-vocabulary?url=https://youtu.be/VIDEO_ID"
   
   # Test batch processing
   curl -X POST "http://localhost:8000/api/v1/youtube/batch-extract" \
     -H "Content-Type: application/json" \
     -d '{"urls": ["https://youtu.be/VIDEO1", "https://youtu.be/VIDEO2"]}'
   ```

3. **OBS Views Testing**
   ```bash
   # Open test interface in browser
   open test_obs_views.html
   
   # Test individual views
   http://localhost:3000/obs?mode=subtitle
   http://localhost:3000/obs?mode=avatar
   # etc.
   ```

## Implementation Progress

### ✅ Phase 1: Foundation (Complete)
- [x] WebSocket CORS configuration fixed
- [x] Message type handling corrected
- [x] Connection lifecycle management improved
- [x] API parameter validation fixed
- [x] Error handling enhanced

### ✅ Phase 2: Core Features (Complete)
- [x] YouTube transcript extraction working
- [x] Vocabulary pattern matching implemented
- [x] Notion database sync functional
- [x] Basic UI components created
- [x] Batch video processing implemented
- [x] Gemini 2.0 Flash integration with streaming
- [x] Web Speech API with advanced language detection

### ✅ Phase 2.7: AI Character & Language Support (Complete - 2025-07-02)
- [x] Rin (りん) character identity established
- [x] Japanese language detection (30% threshold)
- [x] Proper Japanese/English response mixing (70/30 rule)
- [x] Japanese TTS voice selection
- [x] Debug logging system throughout pipeline
- [x] Error recovery mechanisms (30-second timeout)
- [🚧] Streaming responses (temporarily disabled for stability)

### ✅ Phase 3.1: OBS Integration (Complete)
- [x] Browser source views (5 modes)
- [x] Real-time subtitle overlay
- [x] WebSocket message tracking
- [x] Avatar view with CSS animations
- [x] Educational overlays structure

### 🚧 Phase 3.2: Advanced OBS Features (Pending)
- [ ] Scene automation logic
- [ ] Educational moment detection
- [ ] OBS control panel interface
- [ ] Advanced avatar animations

### 📅 Phase 4: Production (Future)
- [ ] Performance optimization
- [ ] Docker containerization
- [ ] CI/CD pipeline
- [ ] Monitoring setup

## Next Steps for New Contributors

### Current System Status (2025-07-02)
- ✅ **AI Conversation**: Fully functional with Rin (りん) character
- ✅ **Japanese Language Support**: Proper detection and response in Japanese
- ✅ **Voice Synthesis**: Japanese TTS working correctly
- ✅ **WebSocket Communication**: Stable with comprehensive logging
- 🚧 **Streaming Responses**: Temporarily disabled for stability (STREAM_ENABLED=false)

### Immediate Tasks
1. **Re-enable Streaming**: Once stable, set STREAM_ENABLED=true and integrate StreamingMessage.tsx
2. **Voice Quality**: Test different Japanese TTS voices for best quality
3. **UI Polish**: Improve the chat interface design and animations
4. **Error Messages**: Localize error messages to Japanese

### Development Workflow
1. **Check API Keys**: Ensure all environment variables are set correctly
   - Most critical: GEMINI_API_KEY for AI responses
2. **Run Tests**: Verify the system works with `pytest` and `npm test`
   - New tests: test_gemini_integration.py, test_web_speech_integration.py
3. **Test Real-time Conversation**: 
   - Start backend and frontend
   - Try speaking in Japanese/English/Mixed
   - Verify Rin responds appropriately in the user's language
4. **Test YouTube Extraction**: Try extracting vocabulary from a Vtuber clip
5. **Test OBS Views**: Use `test_obs_views.html` to see all OBS browser sources
6. **Continue Phase 3.2**: Implement scene automation and educational overlays
7. **Start Phase 4**: Begin performance optimization and deployment prep

## Recent Updates

### AI Response System Overhaul (2025-07-02)
- **Language Detection**: Implemented proper Japanese/English detection with 30% threshold
- **Response Language Fix**: Japanese questions now receive Japanese-primary responses (70/30 rule)
- **TTS Language Fix**: Japanese text now uses Japanese voice synthesis instead of English
- **Character Identity**: AI assistant "Rin (りん)" properly introduces herself
- **Debug System**: Added comprehensive logging throughout WebSocket pipeline
- **Error Recovery**: 30-second timeout for stuck "AIが考えています..." states
- **Voice Selection**: Intelligent selection of Japanese voices (prefers Google Japanese)

### Frontend Fixes (2025-07-02 Morning)
- Fixed port configuration to use 3003 consistently
- Resolved WebSpeechInterface circular dependency
- Added isConnecting property to WebSocketContext
- Updated all startup scripts for correct ports
- Integrated animated microphone button UI

### Gemini 2.0 Flash Integration (2025-06-30)
- Upgraded google-generativeai from 0.3.2 to 0.8.5
- Changed from experimental to production model
- Implemented streaming response support
- Added rate limiting (60 requests/minute)
- Optimized prompts for Vtuber content
- Enhanced error handling (TimeoutError, BlockedPromptException)

### Web Speech API Enhancement (2025-06-30)
- Created WebSpeechHandler for backend processing
- Implemented LanguageDetector with Japanese/English/Mixed support
- Added SpeechRecognitionManager for state tracking
- Enhanced error recovery with user-friendly messages
- Integrated with streaming AI responses

### Code Refactoring (Previous)
- **Backend**: Modularized API endpoints into v1 structure
- **Backend**: Removed duplicate speech service files
- **Backend**: Organized services with clear exports
- **Frontend**: Created organized hooks, utils, and constants
- **Frontend**: Added proper TypeScript type definitions
- **Both**: Improved code organization for better maintainability

### Batch Processing (Phase 2.4)
- Added `/api/v1/youtube/batch-extract` endpoint
- Created BatchProcessor React component
- Implemented real-time progress tracking
- Added background task processing

### OBS Integration (Phase 3.1)
- Created 5 different OBS view modes
- Implemented WebSocket message tracking
- Added avatar state management
- Built customizable overlay system
- Created testing interfaces

## Debugging Tips

1. **Check Logs First**
   ```bash
   tail -f backend/backend.log
   ```

2. **Verify API Keys**
   ```python
   # backend/test_keys.py
   from app.core.config import settings
   print(f"Gemini key starts with: {settings.GEMINI_API_KEY[:10]}...")
   print(f"Notion DB ID length: {len(settings.NOTION_DATABASE_ID)}")
   ```

3. **Test Individual Services**
   ```python
   # Test YouTube service
   from app.services.youtube_service import YouTubeService
   service = YouTubeService()
   result = await service.get_video_info("VIDEO_ID")
   ```

4. **Debug OBS Views**
   ```javascript
   // Check WebSocket connection in browser console
   // Look for "WebSocket connected" message
   // Monitor message flow in Network tab
   ```

## Security Considerations

- Never commit API keys to git
- Use environment variables for all secrets
- Sanitize user inputs for XSS prevention
- Rate limit API endpoints
- Validate WebSocket messages
- Use HTTPS in production

## Performance Targets

- Audio recognition latency: <1s (95th percentile)
- AI response generation: <2s (95th percentile)
- Concurrent sessions: 100 users
- WebSocket message throughput: 1000 msg/s
- YouTube processing: 10 videos/minute
- Batch processing: 50 videos/batch

## Deployment Checklist

- [ ] Set secure SECRET_KEY
- [ ] Configure HTTPS certificates
- [ ] Set up Redis for sessions
- [ ] Configure CORS for production domain
- [ ] Set up CDN for static assets
- [ ] Enable monitoring (Sentry, etc.)
- [ ] Configure rate limiting
- [ ] Set up backup strategy
- [ ] Use production database (PostgreSQL)

## Free Hosting Options

1. **Backend**: Railway, Render, Fly.io
2. **Frontend**: Vercel, Netlify, Cloudflare Pages
3. **Database**: Supabase, PlanetScale
4. **Redis**: Upstash, Railway

## OBS Setup Guide

### Basic Setup
1. Add Browser Source in OBS
2. Set URL: `http://localhost:3000/obs?mode=subtitle`
3. Set dimensions: 1920x1080 (or your stream resolution)
4. Check "Shutdown source when not visible" for performance

### Available Parameters
- `mode`: subtitle, chat, educational, avatar, analysis
- `fontSize`: 16-48 (default: 24)
- `position`: top, bottom (subtitle mode only)
- `theme`: dark, light, transparent
- `maxMessages`: 5-50 (chat mode only)

### Example URLs
```
# Bottom subtitles with large font
http://localhost:3000/obs?mode=subtitle&position=bottom&fontSize=32

# Transparent chat overlay
http://localhost:3000/obs?mode=chat&theme=transparent&maxMessages=10

# Avatar with default settings
http://localhost:3000/obs?mode=avatar

# Educational overlay
http://localhost:3000/obs?mode=educational&fontSize=28
```

## Code Style Guidelines

### Python (Backend)
- Use type hints for all function parameters and returns
- Follow PEP 8 with 100 character line limit
- Use async/await for all I/O operations
- Document with docstrings (Google style)
- Handle errors explicitly with try/except

### TypeScript (Frontend)
- Use strict mode and proper typing
- Prefer functional components with hooks
- Use async/await over promises
- Document complex logic with JSDoc comments
- Handle loading and error states in UI

### Git Commit Messages
- Format: `type(scope): description`
- Types: feat, fix, docs, style, refactor, test, chore
- Example: `feat(ai): implement Gemini 2.0 Flash streaming`
- Include ticket/issue number if applicable

---

**Remember**: This project transforms entertainment into education. Every Vtuber clip processed creates permanent learning value! 🚀