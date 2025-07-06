# AIVlingual Backend

AI-powered bilingual Vtuber assistant backend with NLP-enhanced vocabulary extraction.

## Project Structure

```
backend/
├── app/                    # Main application code
│   ├── api/               # API endpoints
│   │   ├── v1/           # API version 1
│   │   └── websocket/    # WebSocket handlers
│   ├── core/             # Core business logic
│   ├── migrations/       # Database migrations
│   ├── models/           # Data models
│   └── services/         # External services integration
├── scripts/              # Utility scripts
│   └── nlp_setup/       # NLP setup scripts
├── tests/               # Test files
├── logs/                # Application logs
├── test_outputs/        # Test export files
└── requirements.txt     # Python dependencies
```

## Setup

### Prerequisites
- Python 3.11+
- Miniconda (recommended) or Python venv

### Installation

1. Create conda environment:
```bash
conda create -n aivlingual_py311 python=3.11
conda activate aivlingual_py311
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Install NLP dependencies (optional, for enhanced vocabulary extraction):
```bash
pip install -r requirements-nlp.txt
python -m spacy download en_core_web_sm
python -m spacy download ja_core_news_sm
```

4. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your API keys
```

### Running the Server

```bash
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Features

- **Bilingual AI Assistant**: Responds in Japanese/English based on user input
- **NLP-Enhanced Vocabulary Extraction**: Extracts 30+ vocabulary items from YouTube videos
- **WebSocket Support**: Real-time communication for speech recognition
- **User Authentication**: JWT-based authentication system
- **Export Functionality**: CSV, JSON, and Anki deck formats
- **Notion Integration**: Sync vocabulary to public database

## API Documentation

When the server is running, visit:
- API Docs: http://localhost:8000/docs
- Alternative Docs: http://localhost:8000/redoc

## Testing

Run tests with pytest:
```bash
pytest
pytest -v  # Verbose output
```

## Development

- Code formatting: `black app/`
- Type checking: `mypy app/`
- Linting: `ruff check app/`