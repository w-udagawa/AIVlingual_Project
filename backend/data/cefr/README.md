# CEFR Dataset Directory

This directory contains vocabulary datasets for automatic CEFR level assignment.

## Dataset Files

### 1. cefr_j_sample.csv
Sample data in CEFR-J format. To obtain the full dataset:
- Visit: http://www.cefr-j.org/download.html
- Download the CEFR-J Wordlist
- Save as `cefr_j_wordlist.csv` in this directory

### 2. frequency_5000.csv
Top 5000 most frequent English words with estimated CEFR levels.
Based on:
- COCA (Corpus of Contemporary American English)
- British National Corpus
- Google Ngram data

### 3. vtuber_gaming_vocab.csv
Specialized vocabulary for VTuber and gaming contexts.
Manually curated with appropriate CEFR levels.

## Data Format

All CSV files should follow this format:
```csv
word,pos,cefr_level,frequency,category
hello,interjection,A1,50000,greeting
computer,noun,A2,45000,technology
```

## License Notes
- CEFR-J Wordlist: Free for research and educational use
- Frequency data: Compiled from publicly available sources
- Custom vocabulary: MIT License