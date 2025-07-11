"""
CEFR Dataset Loader
Loads and manages CEFR-J Wordlist and Oxford 3000/5000 datasets
"""

import csv
import json
import logging
from pathlib import Path
from typing import Dict, Optional, Set, List
import hashlib
from datetime import datetime
import os

logger = logging.getLogger(__name__)


class CEFRDatasetLoader:
    """
    Manages CEFR level datasets for automatic difficulty assignment
    """
    
    def __init__(self, data_dir: Optional[Path] = None):
        self.data_dir = data_dir or Path(__file__).parent.parent.parent / "data" / "cefr"
        self.cefr_j_wordlist: Dict[str, Dict] = {}
        self.oxford_3000: Dict[str, Dict] = {}
        self.oxford_5000: Dict[str, Dict] = {}
        self.word_frequency: Dict[str, int] = {}
        
        # Initialize datasets
        self._load_datasets()
    
    def _load_datasets(self):
        """Load all CEFR datasets"""
        try:
            # Try to load CSV files first
            csv_loaded = False
            
            # Load CEFR-J data
            cefr_j_path = self.data_dir / "cefr_j_sample.csv"
            if cefr_j_path.exists():
                self._load_cefr_j_csv(cefr_j_path)
                csv_loaded = True
                logger.info(f"Loaded {len(self.cefr_j_wordlist)} CEFR-J words from CSV")
            
            # Load frequency data
            freq_path = self.data_dir / "frequency_5000.csv"
            if freq_path.exists():
                self._load_frequency_csv(freq_path)
                csv_loaded = True
                logger.info(f"Loaded {len(self.word_frequency)} frequency entries from CSV")
            
            # Load VTuber/gaming vocabulary
            vtuber_path = self.data_dir / "vtuber_gaming_vocab.csv"
            if vtuber_path.exists():
                self._load_vtuber_csv(vtuber_path)
                csv_loaded = True
                logger.info(f"Loaded VTuber/gaming vocabulary from CSV")
            
            # Fall back to sample data if no CSV files found
            if not csv_loaded:
                logger.warning("No CSV files found, using sample data")
                self._initialize_sample_data()
            
            logger.info(f"Total loaded: {len(self.cefr_j_wordlist)} CEFR-J, {len(self.oxford_3000)} Oxford 3000, {len(self.oxford_5000)} Oxford 5000")
        except Exception as e:
            logger.error(f"Error loading CEFR datasets: {str(e)}")
            # Fall back to sample data
            self._initialize_sample_data()
    
    def _initialize_sample_data(self):
        """Initialize with sample data for immediate use"""
        # CEFR-J Wordlist samples (most common English words for Japanese learners)
        self.cefr_j_wordlist = {
            # A1 level
            "hello": {"level": "A1", "pos": "interjection", "frequency": 10000},
            "thank": {"level": "A1", "pos": "verb", "frequency": 9500},
            "thanks": {"level": "A1", "pos": "noun", "frequency": 9500},
            "please": {"level": "A1", "pos": "adverb", "frequency": 9000},
            "sorry": {"level": "A1", "pos": "adjective", "frequency": 8500},
            "yes": {"level": "A1", "pos": "adverb", "frequency": 10000},
            "no": {"level": "A1", "pos": "adverb", "frequency": 10000},
            "good": {"level": "A1", "pos": "adjective", "frequency": 9000},
            "morning": {"level": "A1", "pos": "noun", "frequency": 8000},
            "night": {"level": "A1", "pos": "noun", "frequency": 8000},
            
            # A2 level
            "understand": {"level": "A2", "pos": "verb", "frequency": 7000},
            "problem": {"level": "A2", "pos": "noun", "frequency": 7500},
            "welcome": {"level": "A2", "pos": "noun", "frequency": 6500},
            "course": {"level": "A2", "pos": "noun", "frequency": 6000},
            "maybe": {"level": "A2", "pos": "adverb", "frequency": 6500},
            "probably": {"level": "A2", "pos": "adverb", "frequency": 6000},
            "actually": {"level": "A2", "pos": "adverb", "frequency": 7000},
            
            # B1 level
            "amazing": {"level": "B1", "pos": "adjective", "frequency": 5000},
            "awesome": {"level": "B1", "pos": "adjective", "frequency": 4500},
            "definitely": {"level": "B1", "pos": "adverb", "frequency": 5500},
            "basically": {"level": "B1", "pos": "adverb", "frequency": 4000},
            "obviously": {"level": "B1", "pos": "adverb", "frequency": 4500},
            
            # B2 level
            "insane": {"level": "B2", "pos": "adjective", "frequency": 3000},
            "ridiculous": {"level": "B2", "pos": "adjective", "frequency": 2500},
            "absolutely": {"level": "B2", "pos": "adverb", "frequency": 4000},
            "literally": {"level": "B2", "pos": "adverb", "frequency": 3500},
        }
        
        # Oxford 3000 (most important words to know)
        self.oxford_3000 = {
            "the": {"cefr": "A1", "rank": 1, "pos": ["article"]},
            "be": {"cefr": "A1", "rank": 2, "pos": ["verb"]},
            "have": {"cefr": "A1", "rank": 3, "pos": ["verb"]},
            "do": {"cefr": "A1", "rank": 4, "pos": ["verb"]},
            "say": {"cefr": "A1", "rank": 5, "pos": ["verb"]},
            "go": {"cefr": "A1", "rank": 6, "pos": ["verb"]},
            "get": {"cefr": "A1", "rank": 7, "pos": ["verb"]},
            "make": {"cefr": "A1", "rank": 8, "pos": ["verb"]},
            "know": {"cefr": "A1", "rank": 9, "pos": ["verb"]},
            "think": {"cefr": "A2", "rank": 10, "pos": ["verb"]},
            "take": {"cefr": "A2", "rank": 11, "pos": ["verb"]},
            "see": {"cefr": "A1", "rank": 12, "pos": ["verb"]},
            "come": {"cefr": "A1", "rank": 13, "pos": ["verb"]},
            "want": {"cefr": "A1", "rank": 14, "pos": ["verb"]},
            "look": {"cefr": "A1", "rank": 15, "pos": ["verb"]},
            "use": {"cefr": "A2", "rank": 16, "pos": ["verb", "noun"]},
            "find": {"cefr": "A2", "rank": 17, "pos": ["verb"]},
            "give": {"cefr": "A1", "rank": 18, "pos": ["verb"]},
            "tell": {"cefr": "A1", "rank": 19, "pos": ["verb"]},
            "work": {"cefr": "A1", "rank": 20, "pos": ["verb", "noun"]},
        }
        
        # Oxford 5000 (additional important words)
        self.oxford_5000 = {
            "achieve": {"cefr": "B1", "rank": 3001, "pos": ["verb"]},
            "acquire": {"cefr": "B2", "rank": 3002, "pos": ["verb"]},
            "adapt": {"cefr": "B2", "rank": 3003, "pos": ["verb"]},
            "adequate": {"cefr": "B2", "rank": 3004, "pos": ["adjective"]},
            "adjust": {"cefr": "B2", "rank": 3005, "pos": ["verb"]},
            "advocate": {"cefr": "C1", "rank": 3006, "pos": ["verb", "noun"]},
            "allocate": {"cefr": "C1", "rank": 3007, "pos": ["verb"]},
            "alternative": {"cefr": "B1", "rank": 3008, "pos": ["noun", "adjective"]},
            "ambiguous": {"cefr": "C1", "rank": 3009, "pos": ["adjective"]},
            "anticipate": {"cefr": "B2", "rank": 3010, "pos": ["verb"]},
        }
        
        # Build frequency index
        for word, data in self.cefr_j_wordlist.items():
            self.word_frequency[word] = data.get("frequency", 1000)
    
    def get_cefr_level(self, word: str, pos: Optional[str] = None) -> Dict:
        """
        Get CEFR level for a word using multiple data sources
        
        Args:
            word: The word to look up
            pos: Part of speech (optional)
            
        Returns:
            Dictionary with level, source, and confidence
        """
        word_lower = word.lower()
        
        # Priority 1: CEFR-J Wordlist (most accurate for Japanese learners)
        if word_lower in self.cefr_j_wordlist:
            return {
                "level": self.cefr_j_wordlist[word_lower]["level"],
                "source": "cefr_j",
                "confidence": 0.95,
                "pos": self.cefr_j_wordlist[word_lower].get("pos", pos)
            }
        
        # Priority 2: Oxford 3000 (essential words)
        if word_lower in self.oxford_3000:
            return {
                "level": self.oxford_3000[word_lower]["cefr"],
                "source": "oxford_3000",
                "confidence": 0.90,
                "rank": self.oxford_3000[word_lower]["rank"],
                "pos": self.oxford_3000[word_lower]["pos"][0] if self.oxford_3000[word_lower]["pos"] else pos
            }
        
        # Priority 3: Oxford 5000 (important words)
        if word_lower in self.oxford_5000:
            return {
                "level": self.oxford_5000[word_lower]["cefr"],
                "source": "oxford_5000",
                "confidence": 0.85,
                "rank": self.oxford_5000[word_lower]["rank"],
                "pos": self.oxford_5000[word_lower]["pos"][0] if self.oxford_5000[word_lower]["pos"] else pos
            }
        
        # Priority 4: Frequency-based estimation
        freq = self.word_frequency.get(word_lower, 0)
        if freq > 0:
            estimated_level = self._estimate_cefr_from_frequency(freq)
            return {
                "level": estimated_level,
                "source": "frequency",
                "confidence": 0.70,
                "frequency": freq,
                "pos": pos
            }
        
        # Default: Make a better guess based on word characteristics
        estimated_level = self._guess_cefr_level(word, pos)
        return {
            "level": estimated_level,
            "source": "default",
            "confidence": 0.50,
            "pos": pos
        }
    
    def _estimate_cefr_from_frequency(self, frequency: int) -> str:
        """Estimate CEFR level based on word frequency"""
        if frequency >= 8000:
            return "A1"
        elif frequency >= 6000:
            return "A2"
        elif frequency >= 4000:
            return "B1"
        elif frequency >= 2000:
            return "B2"
        elif frequency >= 1000:
            return "C1"
        else:
            return "C2"
    
    def _load_cefr_j_csv(self, filepath: Path):
        """Load CEFR-J wordlist from CSV"""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    word = row['word'].lower()
                    self.cefr_j_wordlist[word] = {
                        "level": row['cefr_level'],
                        "pos": row['pos'],
                        "frequency": int(row.get('frequency', 1000)),
                        "category": row.get('category', 'general'),
                        "japanese": row.get('japanese', '')
                    }
                    # Also update frequency index
                    self.word_frequency[word] = int(row.get('frequency', 1000))
        except Exception as e:
            logger.error(f"Error loading CEFR-J CSV: {str(e)}")
    
    def _load_frequency_csv(self, filepath: Path):
        """Load frequency data from CSV"""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    word = row['word'].lower()
                    freq = int(row['frequency'])
                    
                    # Update frequency index
                    self.word_frequency[word] = freq
                    
                    # Add to appropriate Oxford list based on rank
                    if freq >= 500000:  # Top words -> Oxford 3000
                        self.oxford_3000[word] = {
                            "cefr": row['estimated_cefr'],
                            "rank": len(self.oxford_3000) + 1,
                            "pos": [row['pos']],
                            "source": row.get('source', 'frequency')
                        }
                    elif freq >= 100000:  # Common words -> Oxford 5000
                        self.oxford_5000[word] = {
                            "cefr": row['estimated_cefr'],
                            "rank": len(self.oxford_5000) + 3001,
                            "pos": [row['pos']],
                            "source": row.get('source', 'frequency')
                        }
        except Exception as e:
            logger.error(f"Error loading frequency CSV: {str(e)}")
    
    def _load_vtuber_csv(self, filepath: Path):
        """Load VTuber/gaming vocabulary from CSV"""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    word = row['word'].lower()
                    # Add to CEFR-J for priority lookup
                    self.cefr_j_wordlist[word] = {
                        "level": row['cefr_level'],
                        "pos": row['pos'],
                        "frequency": 5000,  # Medium frequency
                        "category": row['category'],
                        "japanese": row.get('japanese', ''),
                        "context": row.get('context', '')
                    }
        except Exception as e:
            logger.error(f"Error loading VTuber CSV: {str(e)}")
    
    def _guess_cefr_level(self, word: str, pos: Optional[str] = None) -> str:
        """Make an educated guess about CEFR level based on word characteristics"""
        word_lower = word.lower()
        
        # Very short common words are usually A1/A2
        if len(word) <= 3:
            return "A1"
        elif len(word) <= 5:
            return "A2"
        
        # Check for common patterns
        if word_lower.endswith('ing') or word_lower.endswith('ed'):
            return "A2"
        elif word_lower.endswith('ly'):
            return "B1"
        elif word_lower.endswith('tion') or word_lower.endswith('sion'):
            return "B1"
        elif word_lower.endswith('ment') or word_lower.endswith('ness'):
            return "B1"
        elif len(word) >= 10:
            return "B2"
        
        # Default to B1 instead of B2
        return "B1"
    
    def get_words_by_level(self, level: str) -> Set[str]:
        """Get all words for a specific CEFR level"""
        words = set()
        
        # From CEFR-J
        for word, data in self.cefr_j_wordlist.items():
            if data["level"] == level:
                words.add(word)
        
        # From Oxford 3000
        for word, data in self.oxford_3000.items():
            if data["cefr"] == level:
                words.add(word)
        
        # From Oxford 5000
        for word, data in self.oxford_5000.items():
            if data["cefr"] == level:
                words.add(word)
        
        return words
    
    def is_high_priority_word(self, word: str) -> bool:
        """Check if a word is high priority for learning"""
        word_lower = word.lower()
        
        # Oxford 3000 words are always high priority
        if word_lower in self.oxford_3000:
            return True
        
        # CEFR-J A1/A2 words are high priority
        if word_lower in self.cefr_j_wordlist:
            level = self.cefr_j_wordlist[word_lower]["level"]
            return level in ["A1", "A2"]
        
        return False
    
    def load_custom_dataset(self, filepath: Path, dataset_type: str = "cefr_j"):
        """Load a custom CEFR dataset from file"""
        try:
            if filepath.suffix == ".csv":
                with open(filepath, "r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        word = row.get("word", "").lower()
                        if dataset_type == "cefr_j":
                            self.cefr_j_wordlist[word] = {
                                "level": row.get("cefr_level", "B1"),
                                "pos": row.get("pos", ""),
                                "frequency": int(row.get("frequency", 1000))
                            }
            elif filepath.suffix == ".json":
                with open(filepath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if dataset_type == "cefr_j":
                        self.cefr_j_wordlist.update(data)
                        
            logger.info(f"Loaded custom dataset from {filepath}")
        except Exception as e:
            logger.error(f"Error loading custom dataset: {str(e)}")


# Singleton instance
cefr_loader = CEFRDatasetLoader()