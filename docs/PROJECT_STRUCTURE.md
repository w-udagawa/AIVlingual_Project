# AIVlingual Project Structure

## Overview

This document describes the organized structure of the AIVlingual project after refactoring.

## Backend Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI application entry point
│   ├── api/
│   │   ├── v1/                    # API version 1
│   │   │   ├── __init__.py
│   │   │   ├── router.py          # Main API router
│   │   │   └── endpoints/         # Modular endpoints
│   │   │       ├── __init__.py
│   │   │       ├── health.py     # Health check endpoints
│   │   │       ├── vocabulary.py  # Vocabulary management
│   │   │       ├── youtube.py     # YouTube processing
│   │   │       └── conversation.py # Conversation management
│   │   └── websocket/
│   │       ├── websocket_handler.py # WebSocket main handler
│   │       └── handlers/          # WebSocket event handlers
│   │           ├── audio_handler.py
│   │           ├── control_handler.py
│   │           ├── speech_handler.py
│   │           └── vocabulary_handler.py
│   ├── core/                      # Core business logic
│   │   ├── config.py             # Configuration settings
│   │   ├── ai_responder.py       # AI response generation
│   │   └── speech_processor.py   # Speech processing logic
│   ├── models/                    # Data models
│   │   ├── __init__.py
│   │   ├── conversation.py       # Conversation models
│   │   └── vocabulary.py         # Vocabulary models
│   └── services/                  # External service integrations
│       ├── __init__.py           # Service exports
│       ├── database_service.py   # Database operations
│       ├── notion_service.py     # Notion API integration
│       ├── youtube_service.py    # YouTube API integration
│       ├── vocabulary_extractor.py # Vocabulary extraction logic
│       ├── obs_service.py        # OBS integration
│       ├── session_manager.py    # Session management
│       ├── browser_tts_service.py # Browser TTS service
│       └── speech/               # Speech services
│           ├── __init__.py
│           ├── base.py           # Base speech service interface
│           ├── speech_manager.py # Speech service manager
│           ├── azure_provider.py # Azure speech provider
│           └── web_speech_provider.py # Web speech provider
```

## Frontend Structure

```
frontend/
├── src/
│   ├── main.tsx                  # Application entry point
│   ├── App.tsx                   # Main application component
│   ├── components/               # React components
│   │   ├── ui/                   # UI components
│   │   │   └── index.ts          # UI exports
│   │   ├── features/             # Feature components
│   │   │   └── index.ts          # Feature exports
│   │   ├── MessageBubble.tsx     # Message display component
│   │   ├── VoiceVisualizer.tsx   # Voice visualization
│   │   ├── ChatDisplay.tsx       # Chat interface
│   │   ├── VocabularyPanel.tsx   # Vocabulary management
│   │   ├── VideoAnalyzer.tsx     # YouTube video analysis
│   │   ├── BatchProcessor.tsx    # Batch processing UI
│   │   └── WebSpeechInterface.tsx # Speech interface
│   ├── contexts/                 # React contexts
│   │   └── WebSocketContext.tsx  # WebSocket connection context
│   ├── hooks/                    # Custom React hooks
│   │   ├── index.ts              # Hook exports
│   │   ├── useOBSMode.ts         # OBS mode detection
│   │   ├── useWebSocket.ts       # WebSocket hook
│   │   ├── useDebounce.ts        # Debounce hook
│   │   └── useLocalStorage.ts   # Local storage hook
│   ├── services/                 # API and service layer
│   │   ├── api/                  # Base API client
│   │   │   ├── client.ts         # API client implementation
│   │   │   ├── config.ts         # API configuration
│   │   │   └── types.ts          # API types
│   │   ├── youtube/              # YouTube service
│   │   ├── vocabulary/           # Vocabulary service
│   │   ├── conversation/         # Conversation service
│   │   └── obs/                  # OBS service
│   ├── obs/                      # OBS-specific components
│   │   ├── OBSRouter.tsx         # OBS view router
│   │   └── views/                # OBS view modes
│   │       ├── OBSSubtitleView.tsx
│   │       ├── OBSChatView.tsx
│   │       ├── OBSEducationalView.tsx
│   │       ├── OBSAvatarView.tsx
│   │       └── OBSAnalysisView.tsx
│   ├── types/                    # TypeScript type definitions
│   │   ├── index.ts              # Common types
│   │   └── global.d.ts           # Global type declarations
│   ├── utils/                    # Utility functions
│   │   └── index.ts              # Utility exports
│   └── constants/                # Application constants
│       └── index.ts              # Constant exports
```

## Key Improvements

### Backend

1. **Modular API Structure**: Endpoints are now organized by feature in the `v1/endpoints` directory
2. **Clear Service Layer**: All external integrations are in the `services` directory
3. **Unified Speech Services**: Speech providers are organized under `services/speech`
4. **API Versioning**: Ready for future API versions with the `v1` structure

### Frontend

1. **Component Organization**: Components are categorized as UI or Feature components
2. **Custom Hooks**: Reusable hooks are centralized in the `hooks` directory
3. **Type Safety**: Common types are defined in a central `types` directory
4. **Constants Management**: All constants are defined in one place
5. **Utility Functions**: Common utilities are available in the `utils` directory

## Benefits

1. **Maintainability**: Clear separation of concerns makes the code easier to maintain
2. **Scalability**: Modular structure allows for easy addition of new features
3. **Reusability**: Common functionality is extracted into reusable modules
4. **Type Safety**: Better TypeScript organization improves type safety
5. **Testing**: Organized structure makes it easier to write and maintain tests

## Next Steps

1. Add comprehensive tests for all modules
2. Set up CI/CD pipeline
3. Add API documentation with OpenAPI/Swagger
4. Implement error boundaries in frontend
5. Add performance monitoring