# NLP Testing Guide

## Quick Start

### Option 1: VSCode (Recommended)
1. Open `backend/test_nlp_improved.py` in VSCode
2. Press `F5` or click "Run and Debug" → "Test NLP Extraction"
3. View color-coded results in terminal

### Option 2: Batch File (Windows)
```batch
cd backend
test_nlp.bat
```

### Option 3: Direct Python
```bash
cd backend
conda activate aivlingual_py311  # If using conda
python test_nlp_improved.py
```

## What to Look For

### ✅ NLP is Working Properly If:
- YouTube extraction returns **30+ vocabulary items**
- NLP models show as "loaded" in status check
- Multiple expression types are found (phrasal verbs, collocations, etc.)

### ❌ NLP is NOT Working If:
- Only **3 vocabulary items** extracted (pattern-based fallback)
- Error messages about missing models
- TypeError about string difficulty (now fixed!)

## Fixed Issues
1. **Difficulty Type Error**: Changed from string ('N3') to numeric (3)
2. **Sort Function**: Now handles both string and numeric difficulty values
3. **Import Errors**: Added proper type checking guards

## Test Output Explained

```
Test 1: NLP Model Status
- Shows if spaCy and language models are loaded

Test 2: Pattern-based Extraction  
- Basic extraction (fallback when NLP fails)
- Should find ~3 items per text

Test 3: NLP-enhanced Extraction
- Advanced extraction using spaCy
- Should find 10-30+ items

Test 4: Sort Function Test
- Verifies mixed difficulty types work

Test 5: YouTube Video Extraction
- Real-world test with actual video
- Should extract 30+ items with NLP
```

## Troubleshooting

### "spaCy not installed"
```bash
conda activate aivlingual_py311
pip install -r requirements-nlp.txt
```

### "No Japanese model found"
```bash
python -m spacy download ja_core_news_sm
```

### Still only getting 3 items?
1. Check conda environment is activated
2. Restart backend server
3. Check logs in `backend/logs/backend.log`

## Success Criteria
- YouTube videos extract **30+ vocabulary items**
- Both Japanese and English texts work
- No TypeError about string difficulty
- Mix of expression types (not just pattern matches)