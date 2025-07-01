# AIVlingual - Transform Vtuber Content into Language Learning Resources

> 🎯 **Revolutionary Concept**: Convert ephemeral Vtuber clips (flow content) into permanent educational databases (stock content)

## 🌟 What is AIVlingual?

AIVlingual is an AI-powered bilingual Vtuber system that transforms entertainment content into lasting educational value. By analyzing Vtuber clips and creating comprehensive language learning databases, we're building the first platform that bridges otaku culture with serious language education.

### The Problem We Solve
- **Traditional Vtuber Clips**: Watch → Enjoy → Forget (temporary value)
- **AIVlingual Approach**: Watch → Learn → Database → Permanent Resource (compound value)

## 🚀 Core Features

### 1. **Automated Vocabulary Extraction**
- Analyzes Vtuber clips for valuable expressions
- Creates searchable database entries
- Provides cultural context and usage examples
- Difficulty ratings for learners

### 2. **Real-time Bilingual Interaction**
- Ultra-low latency conversations (< 1 second)
- Seamless Japanese/English switching
- Context-aware responses
- Natural language processing

### 3. **Content Multiplication Engine**
- 1 clip → 5+ content pieces
- YouTube videos, Shorts, database entries
- Social media posts, worksheets
- SEO-optimized materials

### 4. **Public Learning Database**
- Notion-powered vocabulary repository
- Search engine friendly
- Community accessible
- Constantly growing

## 💰 Business Model

**Flow-to-Stock Content Strategy**:
```
Vtuber Clip (Flow) → AI Analysis → Multiple Formats (Stock)
                                    ├── YouTube Videos
                                    ├── Vocabulary Database
                                    ├── Learning Materials
                                    └── Social Content
```

## 🛠️ Technology Stack

### AI & Language Processing
- **Gemini 2.0 Flash**: Ultra-fast AI responses (FREE tier)
- **Web Speech API**: Browser-based STT (FREE)
- **Style-Bert-VITS2**: Local voice synthesis (planned)

### Development Stack
- **Backend**: Python 3.11+, FastAPI, WebSocket
- **Frontend**: Next.js 14, TypeScript, Tailwind
- **Database**: SQLite (local), Notion API (public)
- **Streaming**: OBS Studio integration

## 📋 Requirements

- Windows 10/11, macOS, or Linux
- Python 3.11+
- Node.js 18+
- OBS Studio 28+ (for streaming)
- Chrome/Edge browser (for Web Speech API)

## 🔧 Quick Start

### 1. Clone and Setup
```bash
git clone [repository-url]
cd AIVlingual_Project

# Quick setup (Linux/Mac)
./scripts/setup.sh

# Quick setup (Windows)
./scripts/setup.bat
```

### 2. Configure API Keys
Edit `backend/.env` with your keys:
- `GEMINI_API_KEY` - [Get free key](https://makersuite.google.com/app/apikey)
- `NOTION_TOKEN` - [Create integration](https://www.notion.so/my-integrations)
- `YOUTUBE_API_KEY` - [Google Cloud Console](https://console.cloud.google.com/)

### 3. Start Development

#### Windows (推奨方法)
```bash
# 仮想環境を使用しない場合
./scripts/start_aivlingual_no_venv.bat
```

#### 手動起動
```bash
# Terminal 1: Backend
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Frontend  
cd frontend
npm run dev
```

### 4. Access Application
- Web Interface: http://localhost:3003
- API Documentation: http://localhost:8000/docs
- OBS Browser Source: http://localhost:3003/obs

## 📺 YouTube Channel Strategy

### Content Pipeline
1. **Source Selection**: Popular Vtuber clips
2. **AI Analysis**: Extract learning points
3. **Content Creation**: Educational videos
4. **Database Building**: Permanent resource
5. **SEO Optimization**: Search visibility

### Monetization Timeline
- **Phase 1** (0-1K subs): Build database, establish format
- **Phase 2** (1K-10K): Enable monetization, affiliate links
- **Phase 3** (10K-100K): Courses, sponsorships, products
- **Phase 4** (100K+): Enterprise solutions, licensing

## 🎯 Unique Value Proposition

### For Viewers
- Learn Japanese through entertainment
- Understand Vtuber culture and slang
- Free access to comprehensive database
- Context-rich learning materials

### For the Creator
- Multiple revenue streams
- Compound content value
- SEO traffic growth
- Community building

## 📊 Project Structure

```
AIVlingual_Project/
├── backend/
│   ├── app/
│   │   ├── core/          # Speech processing, AI logic
│   │   ├── services/      # External API integrations
│   │   └── api/          # WebSocket & REST endpoints
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── services/     # API clients
│   │   └── obs/         # OBS-specific features
│   └── public/
├── docs/
│   ├── ARCHITECTURE.md   # Technical details
│   ├── BUSINESS_MODEL.md # Revenue strategy
│   ├── USER_GUIDE.md     # User documentation
│   └── TESTING_GUIDE.md  # Testing documentation
├── scripts/              # Setup and utility scripts
│   ├── setup.bat/sh      # Initial setup
│   └── start_aivlingual.bat/sh # Start application
├── tests/                # Test files and utilities
└── obs-assets/          # Streaming resources
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Vtuber community for inspiring content
- Language learners worldwide
- Open source contributors
- [Anthropic](https://anthropic.com) for Claude API

## 📞 Support & Contact

- **Documentation**: See `/docs` folder
- **Issues**: GitHub Issues
- **Discord**: [Coming Soon]
- **Email**: [Coming Soon]

---

**Remember**: Every Vtuber clip processed creates permanent educational value. We're not just watching streams; we're building the future of language learning! 🚀