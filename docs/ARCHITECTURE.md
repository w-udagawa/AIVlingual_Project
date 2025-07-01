# AIVlingual Technical Architecture

## 🎯 Architecture Overview: Flow-to-Stock Content Pipeline

AIVlingual transforms ephemeral Vtuber content into permanent educational resources through an automated pipeline that maximizes value extraction from every piece of content.

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLOW-TO-STOCK PIPELINE                         │
├─────────────────────────────────────────────────────────────────┤
│   Vtuber Clip → Transcript → Analysis → Database → Multi-format  │
│                    ↓           ↓          ↓           ↓          │
│                 Gemini 2.0  Expression  Notion    YouTube/       │
│                   Flash     Extraction    API     Social Media   │
└─────────────────────────────────────────────────────────────────┘
```

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Content Creation Layer                    │
├─────────────────────┬─────────────────────┬────────────────────┤
│    OBS Studio       │   Web Interface     │   YouTube Studio    │
│  - Live Streaming   │  - Real-time Chat   │  - Video Upload     │
│  - Recording        │  - Vocabulary View  │  - Analytics        │
│  - Scene Control    │  - Database Admin   │  - Comments         │
└────────┬────────────┴────────┬────────────┴────────────────────┘
         │                     │
         ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Real-time Processing Layer                     │
├─────────────────────────────────────────────────────────────────┤
│          WebSocket Gateway (Socket.IO)                           │
│               ↓                ↓                ↓                │
│      Speech Recognition    AI Response    Voice Synthesis        │
│      (Web Speech API)     (Gemini 2.0)   (Style-Bert-VITS2)    │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Content Processing Layer                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐         │
│  │  Transcript  │  │  Expression  │  │   Difficulty   │         │
│  │  Extraction  │  │   Analysis   │  │  Assessment    │         │
│  └──────┬──────┘  └──────┬───────┘  └───────┬────────┘         │
│         └─────────────────┴──────────────────┘                  │
│                           ↓                                      │
│                 Vocabulary Processor                             │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Storage & Distribution Layer                   │
├──────────────┬──────────────┬──────────────┬───────────────────┤
│   SQLite     │    Notion    │   YouTube    │  Social Media     │
│  (Cache)     │  (Public DB) │  (Archive)   │   (Clips)         │
└──────────────┴──────────────┴──────────────┴───────────────────┘
```

## Core Components

### 1. Real-time AI Pipeline

```python
# backend/app/core/gemini_live_handler.py
class GeminiLiveHandler:
    """
    Ultra-low latency conversation handler using Gemini 2.0 Flash
    """
    def __init__(self):
        self.client = GeminiLiveClient(
            api_key=GEMINI_API_KEY,
            model="gemini-2.0-flash-exp"
        )
        
    async def process_audio_stream(self, audio_chunks):
        # Direct audio processing without transcription
        response = await self.client.stream_multimodal(
            audio=audio_chunks,
            system_prompt=self.bilingual_prompt
        )
        return response
```

### 2. Vocabulary Extraction Engine

```python
# backend/app/services/vocabulary_extractor.py
class VocabularyExtractor:
    """
    Core business logic: Converting conversations to database entries
    """
    
    async def extract_from_conversation(self, transcript: str) -> List[VocabularyItem]:
        # Use Gemini to identify learning-worthy expressions
        prompt = f"""
        Analyze this Vtuber conversation and extract:
        1. Slang/Internet expressions
        2. Cultural references
        3. Grammar patterns worth learning
        4. Common mistakes to avoid
        
        Transcript: {transcript}
        """
        
        analysis = await self.gemini.analyze(prompt)
        return self.parse_vocabulary_items(analysis)
    
    async def create_notion_entries(self, items: List[VocabularyItem]):
        # Batch create entries in public Notion database
        for item in items:
            await self.notion.create_page({
                "Japanese": item.japanese,
                "English": item.english,
                "Context": item.usage_context,
                "Difficulty": item.difficulty,
                "Source": item.video_source,
                "Timestamp": item.timestamp_link,
                "Tags": item.cultural_tags
            })
```

### 3. Content Multiplication System

```typescript
// frontend/src/services/ContentMultiplier.ts
class ContentMultiplier {
  /**
   * Transform single stream into multiple content pieces
   */
  async processStreamRecording(recordingId: string) {
    const recording = await this.getRecording(recordingId);
    
    // Generate multiple outputs
    const outputs = await Promise.all([
      this.createMainVideo(recording),        // 15-20 min educational video
      this.createShorts(recording),           // 3-5 YouTube Shorts
      this.createVocabularyList(recording),   // Notion database entries
      this.createWorksheet(recording),        // PDF download
      this.createSocialPosts(recording)       // Twitter/Instagram content
    ]);
    
    return outputs;
  }
}
```

### 4. OBS Integration Architecture

```javascript
// frontend/src/obs/ObsController.ts
class ObsController {
  private websocket: OBSWebSocket;
  
  async setupEducationalStream() {
    // Automated scene management
    await this.websocket.call('SetCurrentProgramScene', {
      sceneName: 'Educational-Main'
    });
    
    // Dynamic overlay updates
    await this.updateOverlay({
      currentVocab: this.currentExpression,
      difficulty: this.difficultyLevel,
      translation: this.translation
    });
  }
}
```

## Data Flow Patterns

### Live Streaming Flow
```
1. Microphone → OBS → Browser Source
2. Browser Source → WebSocket → Backend
3. Backend → Gemini 2.0 → Response
4. Response → TTS → OBS Audio
5. OBS → YouTube Live → Viewers
```

### Vocabulary Extraction Flow
```
1. Stream Recording → Transcript Extraction
2. Transcript → Gemini Analysis
3. Analysis → Expression Identification
4. Expressions → Notion API
5. Notion → Public Database → SEO Traffic
```

### Content Generation Flow
```
1. Raw Recording → Auto-edit Points
2. Edit Points → Clip Generation
3. Clips → Thumbnail Generation
4. Metadata → YouTube Upload
5. YouTube → Algorithm → Discovery
```

## Technology Stack Details

### Backend Stack
- **FastAPI**: Async Python web framework
- **Socket.IO**: Real-time bidirectional communication
- **SQLAlchemy**: ORM for database operations
- **Pydantic**: Data validation and serialization
- **httpx**: Async HTTP client for API calls
- **python-multipart**: File upload handling

### Frontend Stack
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Socket.IO Client**: WebSocket connection
- **Tailwind CSS**: Utility-first styling
- **Radix UI**: Accessible component primitives
- **React Query**: Server state management

### AI/ML Services
- **Gemini 2.0 Flash**: Primary conversation AI (FREE)
- **Web Speech API**: Browser-based STT (FREE)
- **Style-Bert-VITS2**: Local voice synthesis (FREE)
- **Azure Speech**: Backup high-quality STT (Pay-per-use)

### External APIs
- **Notion API**: Vocabulary database storage
- **YouTube Data API**: Video metadata and upload
- **OBS WebSocket**: Scene control and automation

## Performance Architecture

### Latency Optimization
```
Target Latencies:
- Speech Recognition: < 500ms
- AI Response: < 1000ms
- TTS Generation: < 300ms
- Total Round Trip: < 2000ms
```

### Caching Strategy
```python
# Multi-level caching for cost optimization
cache_layers = {
    "memory": InMemoryCache(ttl=300),      # 5 min
    "redis": RedisCache(ttl=3600),         # 1 hour
    "sqlite": SQLiteCache(ttl=86400),      # 1 day
    "cdn": CloudflareCache(ttl=604800)     # 1 week
}
```

### Scalability Design
- Stateless API servers
- Horizontal scaling ready
- CDN for static assets
- Database read replicas
- Queue-based processing

## Security Architecture

### API Security
```python
# Rate limiting per endpoint
rate_limits = {
    "/api/transcribe": "10/minute",
    "/api/analyze": "30/minute",
    "/api/generate": "100/hour",
    "/api/notion/sync": "1000/day"
}
```

### Data Protection
- No permanent audio storage
- Encrypted API communications
- Environment-based secrets
- CORS restriction for OBS
- Input sanitization

## Cost Optimization Architecture

### Free Tier Maximization
```yaml
services:
  gemini_api:
    tier: free
    limit: 100M_tokens/month
    strategy: cache_responses
    
  web_speech:
    tier: free
    limit: unlimited
    strategy: browser_only
    
  notion_api:
    tier: free
    limit: 1000_blocks
    strategy: batch_operations
    
  hosting:
    frontend: vercel_free
    backend: railway_free
    database: sqlite_local
```

### Progressive Cost Model
```
Phase 1 (0-1000 subs): Everything FREE
Phase 2 (1000-10K subs): Add Azure Speech ($5/month)
Phase 3 (10K+ subs): Add dedicated hosting ($20/month)
Phase 4 (Monetized): Scale with revenue (1-5% of income)
```

## Development Architecture

### Local Development
```bash
# Parallel service startup
npm run dev:all  # Starts both frontend and backend

# Individual services
npm run dev:backend   # FastAPI with auto-reload
npm run dev:frontend  # Next.js with HMR
npm run dev:obs       # OBS test environment
```

### Testing Architecture
```
tests/
├── unit/          # Component logic
├── integration/   # API endpoints
├── e2e/          # User flows
└── performance/  # Latency benchmarks
```

### CI/CD Pipeline
```yaml
# GitHub Actions workflow
steps:
  - test: Run pytest and Jest
  - build: Create Docker images
  - deploy: Push to staging
  - smoke: Run health checks
  - promote: Deploy to production
```

## Future Architecture Expansions

### Phase 2: Community Features
- Discord bot integration
- Collaborative vocabulary lists
- User-submitted clips
- Gamification system

### Phase 3: Advanced AI
- Custom fine-tuned models
- Personality synthesis
- Dynamic difficulty adjustment
- Predictive content generation

### Phase 4: Platform Expansion
- Mobile app architecture
- API marketplace
- White-label solution
- Enterprise features

## Monitoring & Observability

### Key Metrics
```python
metrics = {
    "latency": {
        "speech_recognition": Histogram(),
        "ai_response": Histogram(),
        "database_write": Histogram()
    },
    "business": {
        "vocabulary_extracted": Counter(),
        "videos_processed": Counter(),
        "user_engagement": Gauge()
    },
    "system": {
        "websocket_connections": Gauge(),
        "api_requests": Counter(),
        "error_rate": Counter()
    }
}
```

### Alerting Rules
- Response time > 3s
- Error rate > 1%
- API quota > 80%
- Database size > 1GB

## Deployment Architecture

### Infrastructure as Code
```terraform
# Minimal production setup
resource "vercel_project" "frontend" {
  name = "aivlingual-app"
  framework = "nextjs"
}

resource "railway_project" "backend" {
  name = "aivlingual-api"
  plugins = ["fastapi", "redis"]
}

resource "cloudflare_zone" "cdn" {
  zone = "aivlingual.com"
}
```

This architecture is designed to start free, scale gradually, and maximize the value extracted from every piece of content created.