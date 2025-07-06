# NLP Integration Guide for AIVlingual

## 📋 Overview

This guide explains how to integrate the new NLP-enhanced vocabulary extraction system into AIVlingual. The NLP system provides significant improvements over pattern-based extraction:

- **Unlimited vocabulary**: No longer limited to pre-registered patterns
- **Multi-word expressions**: Detects phrasal verbs, idioms, and collocations
- **Automatic difficulty levels**: Uses CEFR datasets for accurate level assignment
- **Intelligent caching**: Redis-based caching for performance

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements-nlp.txt
python -m spacy download en_core_web_lg
```

### 2. Optional: Setup Redis

```bash
# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis

# macOS
brew install redis
brew services start redis

# Windows (WSL)
sudo apt-get install redis-server
redis-server
```

### 3. Update Environment Variables

```bash
# backend/.env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
```

## 🔧 Integration Steps

### Option 1: Gradual Migration (Recommended)

1. **Keep existing system running**
   - The NLP extractor inherits from `VocabularyExtractor`
   - All existing functionality remains intact

2. **Add NLP as an optional enhancement**
   ```python
   # In vocabulary.py endpoint
   from app.services.nlp_vocabulary_extractor import nlp_extractor, NLP_AVAILABLE
   
   if NLP_AVAILABLE and request.use_nlp:
       vocabulary = await nlp_extractor.extract_from_conversation_enhanced(...)
   else:
       vocabulary = await extractor.extract_from_conversation(...)
   ```

3. **Add frontend toggle**
   ```typescript
   // Add to settings
   useNLPExtraction: boolean = false;
   ```

### Option 2: Full Replacement

1. **Replace imports**
   ```python
   # Before
   from app.services.vocabulary_extractor import VocabularyExtractor
   extractor = VocabularyExtractor()
   
   # After
   from app.services.nlp_vocabulary_extractor import nlp_extractor
   ```

2. **Update API endpoints**
   ```python
   # In vocabulary.py
   @router.post("/extract")
   async def extract_vocabulary(request: VocabularyExtractRequest):
       if request.source_type == "conversation":
           # Use NLP extractor
           vocabulary_items = await nlp_extractor.extract_from_conversation_enhanced(
               request.transcript,
               request.context
           )
   ```

## 📊 Performance Considerations

### With spaCy + Redis
- First extraction: ~2-3 seconds
- Cached extraction: <100ms
- Memory usage: +200-300MB (spaCy models)

### Without spaCy (Fallback)
- Uses existing pattern matching
- No performance impact
- Limited to registered patterns

### Without Redis (Fallback)
- Uses in-memory cache
- Cache cleared on restart
- Suitable for development

## 🧪 Testing the Integration

### 1. Run the Test Suite
```bash
cd tests
python test_nlp_extraction.py
```

### 2. Test with Real Content
```bash
# Test English extraction
curl -X POST http://localhost:8000/api/v1/vocabulary/extract \
  -H "Content-Type: application/json" \
  -d '{
    "source_type": "conversation",
    "transcript": "Hey guys, lets check out this amazing game!",
    "context": {"target_language": "english"}
  }'
```

### 3. Compare Results
The NLP extractor should find:
- "check out" (phrasal verb)
- "amazing" (B1 level adjective)
- "guys" (informal address)

While pattern matching might only find:
- "amazing" (if in patterns)

## 📈 Monitoring & Debugging

### Check if NLP is Active
```python
from app.services.nlp_vocabulary_extractor import SPACY_AVAILABLE, REDIS_AVAILABLE

print(f"spaCy available: {SPACY_AVAILABLE}")
print(f"Redis available: {REDIS_AVAILABLE}")
```

### View Cache Stats
```python
# In a debug endpoint
cache_info = {
    "redis_connected": nlp_extractor.cache is not None,
    "memory_cache_size": len(nlp_extractor.cache.memory_cache) if hasattr(nlp_extractor.cache, 'memory_cache') else 0
}
```

### Debug Extraction
```python
# Enable detailed logging
import logging
logging.getLogger('app.services.nlp_vocabulary_extractor').setLevel(logging.DEBUG)
```

## 🎯 Best Practices

1. **Start with Optional NLP**
   - Add as a user preference first
   - Monitor performance and accuracy
   - Gradually increase usage

2. **Cache Warming**
   - Pre-process popular videos during off-peak
   - Cache results for 24-48 hours

3. **Resource Management**
   - Load spaCy models once at startup
   - Set Redis connection pooling
   - Monitor memory usage

4. **Fallback Strategy**
   - Always have pattern matching as backup
   - Gracefully handle spaCy/Redis failures
   - Log degraded performance

## 🔄 Migration Checklist

- [ ] Install NLP dependencies
- [ ] Configure Redis (optional)
- [ ] Update vocabulary extraction endpoints
- [ ] Add frontend toggle (if gradual migration)
- [ ] Test with sample content
- [ ] Monitor performance metrics
- [ ] Update documentation
- [ ] Train content creators on new features

## 📚 Additional Resources

- [spaCy Documentation](https://spacy.io/usage)
- [CEFR Levels Explained](https://www.coe.int/en/web/common-european-framework-reference-languages)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)

## 🆘 Troubleshooting

### "No module named 'spacy'"
```bash
pip install -r requirements-nlp.txt
```

### "No spaCy model found"
```bash
python -m spacy download en_core_web_lg
```

### "Redis connection refused"
```bash
# Check if Redis is running
redis-cli ping
# Should return "PONG"
```

### High Memory Usage
- Use smaller spaCy model: `en_core_web_sm`
- Reduce cache TTL
- Limit concurrent extractions

## 🎉 Success Metrics

After integration, you should see:
- 3-5x more vocabulary extracted per video
- Better detection of natural expressions
- Accurate difficulty levels
- Faster processing of repeat content
- Higher user engagement with vocabulary