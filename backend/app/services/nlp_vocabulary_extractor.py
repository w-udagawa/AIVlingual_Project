"""
NLP-Enhanced Vocabulary Extractor
Combines spaCy NLP processing with CEFR datasets and AI enhancement
"""
from __future__ import annotations

import re
import json
import logging
import hashlib
from typing import Dict, List, Optional, Set, Tuple, TYPE_CHECKING
from datetime import datetime, timedelta
import asyncio

# Optional imports with fallbacks
try:
    import spacy
    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False
    spacy = None
    logging.warning("spaCy not available. Install with: pip install -r requirements-nlp.txt")

# Type checking imports
if TYPE_CHECKING:
    from spacy.tokens import Doc, Token, Span
else:
    # Define dummy types when not type checking
    Doc = object
    Token = object
    Span = object

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    redis = None
    logging.warning("Redis not available. Caching will be disabled.")

from app.services.cefr_dataset_loader import cefr_loader
from app.services.vocabulary_extractor import VocabularyExtractor
from app.models.vocabulary import VocabularyModel
from app.core.config import settings

logger = logging.getLogger(__name__)


class NLPVocabularyExtractor(VocabularyExtractor):
    """
    Enhanced vocabulary extractor using NLP techniques
    """
    
    def __init__(self):
        super().__init__()
        
        # Initialize NLP models
        self.nlp_en = None
        self.nlp_ja = None
        self._initialize_nlp_models()
        
        # Initialize caching
        self.cache = None
        self.cache_ttl = 86400  # 24 hours
        self._initialize_cache()
        
        # CEFR dataset loader
        self.cefr_loader = cefr_loader
        
        # Multi-word expression patterns
        self.phrasal_verb_particles = {
            "up", "down", "in", "out", "on", "off", "over", "under",
            "away", "back", "through", "along", "across", "by", "forward"
        }
        
        # Common words to skip (A1 level)
        self.skip_words = {
            "be", "have", "do", "say", "go", "get", "make", "know", "think", "take",
            "see", "come", "want", "look", "use", "find", "give", "tell", "work", "call",
            "try", "ask", "need", "feel", "become", "leave", "put", "mean", "keep", "let",
            "good", "new", "first", "last", "long", "great", "little", "own", "other",
            "old", "right", "big", "high", "different", "small", "large", "next", "early",
            "yes", "no", "thank", "thanks", "sorry", "hello", "hi", "bye", "please"
        }
    
    def _initialize_nlp_models(self):
        """Initialize spaCy models if available"""
        if not SPACY_AVAILABLE:
            logger.warning("spaCy not available, using pattern-based extraction only")
            return
        
        try:
            # Try to load English model - Method 1: Direct import
            for model_name in ["en_core_web_lg", "en_core_web_sm"]:
                try:
                    import importlib
                    pkg = importlib.import_module(model_name)
                    self.nlp_en = pkg.load()
                    logger.info(f"Loaded English model via direct import: {model_name}")
                    break
                except ModuleNotFoundError as e:
                    logger.warning(f"{model_name} not installed: {e}")
                except Exception:
                    logger.exception(f"Failed loading {model_name} via direct import")
            
            # Method 2: Fallback to spacy.load() if direct import failed
            if self.nlp_en is None:
                for model_name in ["en_core_web_lg", "en_core_web_sm"]:
                    try:
                        self.nlp_en = spacy.load(model_name)
                        logger.info(f"Loaded English model via spacy.load: {model_name}")
                        break
                    except OSError as e:
                        logger.warning(f"spacy.load({model_name}) failed: {e}")
                    except Exception:
                        logger.exception(f"Unexpected error loading {model_name}")
                
                if self.nlp_en is None:
                    logger.error("No English spaCy model could be loaded. Run: python -m spacy download en_core_web_sm")
            
            # Try to load Japanese model - Method 1: Direct import
            japanese_models = [("ginza", "ja_ginza"), ("ja_core_news_sm", "ja_core_news_sm"), ("ja_core_news_lg", "ja_core_news_lg")]
            
            for import_name, load_name in japanese_models:
                try:
                    if import_name == "ginza":
                        import ginza
                        self.nlp_ja = spacy.load(load_name)
                        logger.info(f"Loaded Japanese GiNZA model")
                        break
                    else:
                        pkg = importlib.import_module(import_name)
                        self.nlp_ja = pkg.load()
                        logger.info(f"Loaded Japanese model via direct import: {import_name}")
                        break
                except ModuleNotFoundError as e:
                    logger.warning(f"{import_name} not installed: {e}")
                except Exception:
                    logger.exception(f"Failed loading {import_name}")
            
            # Method 2: Fallback to spacy.load() if direct import failed
            if self.nlp_ja is None:
                for _, model_name in japanese_models[1:]:  # Skip GiNZA for spacy.load
                    try:
                        self.nlp_ja = spacy.load(model_name)
                        logger.info(f"Loaded Japanese model via spacy.load: {model_name}")
                        break
                    except OSError as e:
                        logger.warning(f"spacy.load({model_name}) failed: {e}")
                    except Exception:
                        logger.exception(f"Unexpected error loading {model_name}")
                
                if self.nlp_ja is None:
                    logger.error("No Japanese spaCy model could be loaded")
                    
        except Exception:
            logger.exception("Fatal error during NLP model initialization")
            raise  # Re-raise to prevent silent failures
    
    def _initialize_cache(self):
        """Initialize Redis cache if available"""
        if not REDIS_AVAILABLE:
            return
        
        try:
            self.cache = redis.Redis(
                host=settings.REDIS_HOST if hasattr(settings, 'REDIS_HOST') else 'localhost',
                port=settings.REDIS_PORT if hasattr(settings, 'REDIS_PORT') else 6379,
                decode_responses=True
            )
            # Test connection
            self.cache.ping()
            logger.info("Redis cache initialized successfully")
        except Exception as e:
            logger.warning(f"Redis connection failed: {str(e)}. Caching disabled.")
            self.cache = None
    
    async def extract_from_text_nlp(self, text: str, target_language: Optional[str] = None) -> List[Dict]:
        """
        Extract vocabulary using NLP techniques
        
        Args:
            text: Text to extract from
            target_language: Target language ('english', 'japanese', or None for auto-detect)
            
        Returns:
            List of extracted expressions with rich metadata
        """
        # Check cache first
        cache_key = self._generate_cache_key(text, target_language)
        cached_result = self._get_from_cache(cache_key)
        if cached_result:
            return cached_result
        
        # Auto-detect language if not specified
        if target_language is None:
            target_language = self.detect_language(text)
        
        expressions = []
        
        # Layer 1: NLP extraction (if available)
        if SPACY_AVAILABLE and ((target_language == 'english' and self.nlp_en) or 
                               (target_language == 'japanese' and self.nlp_ja)):
            nlp_expressions = self._extract_with_spacy(text, target_language)
            expressions.extend(nlp_expressions)
        
        # Layer 2: Pattern-based extraction (fallback and supplement)
        logger.info(f"NLP expressions count before pattern matching: {len(expressions)}")
        pattern_expressions = self.extract_from_text(text, target_language)
        
        # Merge and deduplicate
        expressions = self._merge_expressions(expressions, pattern_expressions)
        
        # Layer 3: Enhance with CEFR levels
        expressions = self._enhance_with_cefr(expressions, target_language)
        
        # Sort by educational priority
        expressions = self._sort_by_priority(expressions)
        
        # Cache results
        self._save_to_cache(cache_key, expressions)
        
        return expressions
    
    def _extract_with_spacy(self, text: str, language: str) -> List[Dict]:
        """Extract expressions using spaCy NLP"""
        expressions = []
        
        # Select appropriate model
        nlp = self.nlp_en if language == 'english' else self.nlp_ja
        if not nlp:
            logger.warning(f"No NLP model available for language: {language}")
            return expressions
        
        logger.info(f"Processing text with spaCy ({language}), text length: {len(text)}")
        
        # Process text
        try:
            doc = nlp(text)
            logger.info(f"spaCy processing complete, doc length: {len(doc)} tokens")
        except Exception:
            logger.exception("Error in spaCy processing")
            return expressions
        
        # Extract various types of expressions
        # 1. Multi-word expressions (phrasal verbs, collocations)
        try:
            multi_word_exprs = self._extract_multiword_expressions(doc, language)
            logger.info(f"Multi-word expressions: {len(multi_word_exprs)}")
            expressions.extend(multi_word_exprs)
        except Exception:
            logger.exception("Error in _extract_multiword_expressions")
        
        # 2. Named entities (useful for context)
        try:
            entities = self._extract_entities(doc, language)
            logger.info(f"Named entities: {len(entities)}")
            expressions.extend(entities)
        except Exception:
            logger.exception("Error in _extract_entities")
        
        # 3. Important single words (based on POS and frequency)
        try:
            single_words = self._extract_important_words(doc, language)
            logger.info(f"Important single words: {len(single_words)}")
            expressions.extend(single_words)
        except Exception:
            logger.exception("Error in _extract_important_words")
        
        # 4. Idiomatic expressions
        try:
            idioms = self._extract_idioms(doc, language)
            logger.info(f"Idiomatic expressions: {len(idioms)}")
            expressions.extend(idioms)
        except Exception:
            logger.exception("Error in _extract_idioms")
        
        logger.info(f"Total expressions extracted with spaCy: {len(expressions)}")
        return expressions
    
    def _extract_multiword_expressions(self, doc: Doc, language: str) -> List[Dict]:
        """Extract phrasal verbs, collocations, and other multi-word expressions"""
        expressions = []
        
        if language == 'english':
            # Phrasal verbs
            for token in doc:
                if token.pos_ == "VERB" and token.i + 1 < len(doc):
                    next_token = doc[token.i + 1]
                    if next_token.text.lower() in self.phrasal_verb_particles:
                        phrasal = f"{token.lemma_} {next_token.text}"
                        
                        # Get full context
                        sent = token.sent
                        context_start = max(0, token.i - 5)
                        context_end = min(len(doc), token.i + 6)
                        context = doc[context_start:context_end].text
                        
                        expressions.append({
                            "expression": phrasal,
                            "type": "phrasal_verb",
                            "pos": "verb",
                            "lemma": token.lemma_,
                            "particle": next_token.text,
                            "context": context,
                            "sentence": sent.text,
                            "language": language,
                            "category": "phrasal_verbs"
                        })
            
            # Common collocations using dependency parsing
            for chunk in doc.noun_chunks:
                if len(chunk) >= 2:
                    # Clean up chunk text
                    chunk_text = chunk.text.strip()
                    chunk_words = chunk_text.split()
                    
                    # Skip if too short or starts with common determiners only
                    if len(chunk_words) < 2 or chunk_text.lower() in ['the', 'a', 'an']:
                        continue
                    
                    # Remove leading determiners for cleaner extraction
                    if chunk_words[0].lower() in ['the', 'a', 'an', 'this', 'that', 'these', 'those']:
                        chunk_text = ' '.join(chunk_words[1:])
                    
                    # Skip if the result is too short or contains only common words
                    if len(chunk_text.split()) < 2 or len(chunk_text) < 5:
                        continue
                    
                    # Check if it's a meaningful collocation
                    is_meaningful = False
                    for token in chunk:
                        if token.pos_ in ["NOUN", "PROPN", "ADJ"] and token.lemma_.lower() not in self.skip_words:
                            is_meaningful = True
                            break
                    
                    if is_meaningful:
                        expressions.append({
                            "expression": chunk_text,
                            "type": "collocation",
                            "pos": "noun_phrase",
                            "root": chunk.root.text,
                            "context": chunk.sent.text,
                            "sentence": chunk.sent.text,
                            "language": language,
                            "category": "collocations"
                        })
        
        elif language == 'japanese':
            # 日本語の複合名詞を抽出
            i = 0
            while i < len(doc):
                token = doc[i]
                
                # 名詞の連続を検出（複合名詞）
                if token.pos_ == "NOUN":
                    compound_parts = [token.text]
                    j = i + 1
                    
                    # 連続する名詞を収集
                    while j < len(doc) and doc[j].pos_ in ["NOUN", "PROPN"]:
                        compound_parts.append(doc[j].text)
                        j += 1
                    
                    # 2つ以上の名詞が連続していれば複合名詞として抽出
                    if len(compound_parts) >= 2:
                        compound = "".join(compound_parts)
                        
                        # 文脈を取得
                        context_start = max(0, i - 5)
                        context_end = min(len(doc), j + 5)
                        context = doc[context_start:context_end].text
                        
                        expressions.append({
                            "expression": compound,
                            "type": "compound_noun",
                            "pos": "noun",
                            "parts": compound_parts,
                            "context": context,
                            "sentence": token.sent.text if hasattr(token, 'sent') else context,
                            "language": language,
                            "category": "compounds"
                        })
                        
                        i = j - 1  # 複合名詞の最後の位置に移動
                
                # 動詞＋ていく/てくる パターン
                if token.pos_ == "VERB" and i + 1 < len(doc):
                    next_token = doc[i + 1]
                    if next_token.text in ["ていく", "ていきます", "てくる", "てきます", "ている", "ています"]:
                        verb_phrase = f"{token.text}{next_token.text}"
                        
                        expressions.append({
                            "expression": verb_phrase,
                            "type": "verb_phrase",
                            "pos": "verb",
                            "base_verb": token.lemma_,
                            "auxiliary": next_token.text,
                            "context": token.sent.text if hasattr(token, 'sent') else "",
                            "sentence": token.sent.text if hasattr(token, 'sent') else "",
                            "language": language,
                            "category": "verb_patterns"
                        })
                
                # 形容詞＋名詞 パターン
                if token.pos_ == "ADJ" and i + 1 < len(doc) and doc[i + 1].pos_ == "NOUN":
                    adj_noun = f"{token.text}{doc[i + 1].text}"
                    
                    expressions.append({
                        "expression": adj_noun,
                        "type": "adj_noun_phrase",
                        "pos": "phrase",
                        "adjective": token.text,
                        "noun": doc[i + 1].text,
                        "context": token.sent.text if hasattr(token, 'sent') else "",
                        "sentence": token.sent.text if hasattr(token, 'sent') else "",
                        "language": language,
                        "category": "descriptive_phrases"
                    })
                
                i += 1
        
        return expressions
    
    def _extract_entities(self, doc: Doc, language: str) -> List[Dict]:
        """Extract named entities that might be educational"""
        expressions = []
        
        # Focus on entities that are educational (not personal names)
        educational_entity_types = {"ORG", "GPE", "LOC", "EVENT", "FAC", "PRODUCT"}
        
        for ent in doc.ents:
            if ent.label_ in educational_entity_types:
                expressions.append({
                    "expression": ent.text,
                    "type": "named_entity",
                    "entity_type": ent.label_,
                    "context": ent.sent.text,
                    "sentence": ent.sent.text,
                    "language": language,
                    "category": "entities"
                })
        
        return expressions
    
    def _extract_important_words(self, doc: Doc, language: str) -> List[Dict]:
        """Extract educationally important single words"""
        expressions = []
        seen_lemmas = set()
        
        for token in doc:
            # Skip punctuation, stop words, and very common words
            if (token.is_punct or token.is_stop or token.is_space or 
                len(token.text) < 3 or token.lemma_ in seen_lemmas):
                continue
            
            # Skip A1 level common words
            if token.lemma_.lower() in self.skip_words:
                continue
            
            # Focus on content words
            if token.pos_ in {"NOUN", "VERB", "ADJ", "ADV"}:
                # Check if it's an important word
                cefr_info = self.cefr_loader.get_cefr_level(token.text, token.pos_)
                
                # Skip A1/A2 level words unless they're part of special vocabulary
                if cefr_info["level"] in ["A1", "A2"] and cefr_info["source"] != "cefr_j":
                    continue
                
                # Include B1+ words or words not in common datasets (potentially specialized)
                if (cefr_info["level"] in ["B1", "B2", "C1", "C2"] or 
                    cefr_info["source"] == "default"):
                    
                    seen_lemmas.add(token.lemma_)
                    
                    # Get context
                    context_start = max(0, token.i - 5)
                    context_end = min(len(doc), token.i + 6)
                    context = doc[context_start:context_end].text
                    
                    expressions.append({
                        "expression": token.text,
                        "type": "single_word",
                        "pos": token.pos_,
                        "lemma": token.lemma_,
                        "context": context,
                        "sentence": token.sent.text,
                        "language": language,
                        "category": "vocabulary",
                        "cefr_level": cefr_info["level"],
                        "cefr_source": cefr_info["source"]
                    })
        
        return expressions
    
    def _extract_idioms(self, doc: Doc, language: str) -> List[Dict]:
        """Extract idiomatic expressions"""
        expressions = []
        
        if language == 'english':
            # Common idiom patterns + VTuber/Gaming expressions
            idiom_patterns = [
                # Traditional idioms
                (r"\b(piece of cake)\b", "very easy"),
                (r"\b(break a leg)\b", "good luck"),
                (r"\b(hit the books)\b", "study hard"),
                (r"\b(call it a day)\b", "stop working"),
                (r"\b(under the weather)\b", "feeling sick"),
                
                # Gaming/Streaming expressions
                (r"\b(rage quit)\b", "quit angrily from frustration"),
                (r"\b(clutch play)\b", "crucial successful play"),
                (r"\b(throw the game)\b", "intentionally lose"),
                (r"\b(stream sniper)\b", "viewer who disrupts streams"),
                (r"\b(backseat gaming)\b", "unwanted advice while playing"),
                (r"\b(skill issue)\b", "problem due to lack of skill"),
                (r"\b(touch grass)\b", "go outside/take a break"),
                (r"\b(no cap)\b", "no lie/for real"),
                (r"\b(based)\b", "admirable/true to oneself"),
                (r"\b(cringe)\b", "embarrassing/awkward"),
                (r"\b(poggers|pog)\b", "awesome/exciting"),
                (r"\b(copium)\b", "coping/denial"),
                (r"\b(hopium)\b", "false hope"),
                (r"\b(throwing hands)\b", "fighting"),
                (r"\b(down bad)\b", "desperate/struggling"),
                (r"\b(rent free)\b", "obsessing over something"),
                
                # Business/work expressions from the video
                (r"\b(quit (?:my|the) job)\b", "resign from employment"),
                (r"\b(open(?:ed)? a franchise)\b", "start a franchise business"),
                (r"\b(MVP today)\b", "most valuable player/person today"),
                (r"\b(crash(?:ing)? out)\b", "losing control emotionally"),
                (r"\b(fast food)\b", "quick service restaurant food"),
                (r"\b(take(?:ing)? (?:the|their) order)\b", "receive customer request"),
                (r"\b(mess(?:ed)? up)\b", "make a mistake"),
                (r"\b(stall(?:ing)?)\b", "delay intentionally"),
            ]
            
            text_lower = doc.text.lower()
            for pattern, meaning in idiom_patterns:
                if re.search(pattern, text_lower):
                    match = re.search(pattern, text_lower)
                    # Find the sentence containing this idiom
                    for sent in doc.sents:
                        if match.group(1) in sent.text.lower():
                            expressions.append({
                                "expression": match.group(1),
                                "type": "idiom",
                                "meaning": meaning,
                                "context": sent.text,
                                "sentence": sent.text,
                                "language": language,
                                "category": "idioms"
                            })
                            break
        
        elif language == 'japanese':
            # 日本語の慣用表現パターン
            # VTuberやカジュアルな会話でよく使われる表現
            idiom_patterns = [
                # 「さあ」で始まる呼びかけ表現
                (r"(さあ[^。！、]*(?:ましょう|しよう|いこう|いきます))", "invitation/let's go"),
                (r"(さあ.*やっていきます)", "let's get started"),
                
                # 感嘆・驚き表現
                (r"(やばい(?:です)?(?:ね)?)", "oh no/amazing"),
                (r"(まじ(?:で)?(?:か)?)", "seriously/really"),
                (r"(すご[いく](?:ない)?)", "amazing/incredible"),
                
                # 配信でよく使う表現
                (r"(お疲れ様でした)", "good work/thank you"),
                (r"(よろしくお願いします)", "please/nice to meet you"),
                (r"(いらっしゃい(?:ませ)?)", "welcome"),
                
                # ゲーム実況でよく使う表現
                (r"(行く[ぞぜ]ー?)", "let's go"),
                (r"(やった[ぜぞ]?)", "yes!/did it!"),
                (r"(ナイス(?:です)?)", "nice!"),
                
                # 困った時の表現
                (r"(どうしよう)", "what should I do"),
                (r"(困った(?:な)?)", "I'm in trouble"),
                (r"(やっちゃった)", "oops/I messed up"),
                
                # 励まし・応援
                (r"(頑張[ろれ](?:う)?)", "do your best"),
                (r"(ファイト(?:だ)?)", "fight/you can do it"),
                
                # その他のVTuber特有表現
                (r"(てぇてぇ)", "precious/wholesome"),
                (r"(草(?:生える)?)", "lol/funny"),
                (r"(ぽん(?:です)?)", "silly/clumsy"),
            ]
            
            text = doc.text
            for pattern, meaning in idiom_patterns:
                matches = re.findall(pattern, text)
                for match in matches:
                    # 文脈を取得
                    start_idx = text.find(match)
                    if start_idx != -1:
                        context_start = max(0, start_idx - 20)
                        context_end = min(len(text), start_idx + len(match) + 20)
                        context = text[context_start:context_end]
                        
                        expressions.append({
                            "expression": match,
                            "type": "idiom",
                            "meaning": meaning,
                            "context": context,
                            "sentence": context,  # 簡易的に文脈を文として使用
                            "language": language,
                            "category": "idioms"
                        })
        
        return expressions
    
    def _merge_expressions(self, nlp_expressions: List[Dict], pattern_expressions: List[Dict]) -> List[Dict]:
        """Merge and deduplicate expressions from different sources"""
        # Create a map to track unique expressions
        expression_map = {}
        
        # Process NLP expressions first (higher priority)
        for expr in nlp_expressions:
            key = expr["expression"].lower()
            if key not in expression_map:
                expression_map[key] = expr
                expr["extraction_method"] = "nlp"
        
        # Add pattern expressions if not already present
        for expr in pattern_expressions:
            key = expr["expression"].lower()
            if key not in expression_map:
                expression_map[key] = expr
                expr["extraction_method"] = "pattern"
            else:
                # Merge additional information
                existing = expression_map[key]
                if "meaning" in expr and "meaning" not in existing:
                    existing["meaning"] = expr["meaning"]
                if "difficulty" in expr and "difficulty" not in existing:
                    existing["difficulty"] = expr["difficulty"]
        
        return list(expression_map.values())
    
    def _enhance_with_cefr(self, expressions: List[Dict], language: str) -> List[Dict]:
        """Enhance expressions with CEFR levels and educational metadata"""
        enhanced = []
        
        for expr in expressions:
            # Get CEFR level if not already present
            if language == 'english' and 'cefr_level' not in expr:
                # For multi-word expressions, check the main word
                expression = expr.get('expression', '').strip()
                if expression:
                    main_word = expr.get('lemma', expression.split()[0])
                else:
                    main_word = expr.get('lemma', '')
                
                if main_word:
                    cefr_info = self.cefr_loader.get_cefr_level(main_word, expr.get('pos'))
                    expr['cefr_level'] = cefr_info['level']
                    expr['cefr_confidence'] = cefr_info['confidence']
                    expr['cefr_source'] = cefr_info['source']
            
            # Set difficulty level for database (1-5 scale)
            if 'difficulty' not in expr:
                if language == 'english':
                    cefr_to_difficulty = {
                        'A1': 1, 'A2': 2, 'B1': 3, 'B2': 4, 'C1': 5, 'C2': 5
                    }
                    expr['difficulty'] = cefr_to_difficulty.get(expr.get('cefr_level', 'B1'), 3)
                else:
                    # Japanese JLPT mapping
                    jlpt_to_difficulty = {
                        'N5': 1, 'N4': 2, 'N3': 3, 'N2': 4, 'N1': 5
                    }
                    expr['difficulty'] = jlpt_to_difficulty.get(expr.get('difficulty', 'N3'), 3)
            
            # Set educational priority
            expr['priority'] = self._calculate_priority(expr, language)
            
            enhanced.append(expr)
        
        return enhanced
    
    def _calculate_priority(self, expression: Dict, language: str) -> int:
        """Calculate educational priority score (1-10)"""
        priority = 5  # Base priority
        
        # Type-based priority adjustments
        expr_type = expression.get('type', '')
        if expr_type == 'idiom':
            priority += 3  # Idioms are high value for language learning
        elif expr_type == 'phrasal_verb':
            priority += 2  # Phrasal verbs are essential for fluency
        elif expr_type == 'collocation':
            priority += 2  # Natural word combinations
        elif expr_type == 'named_entity' and expression.get('entity_type') in ['ORG', 'PRODUCT']:
            priority += 1  # Brand names and products in context
        
        # CEFR-based adjustments
        cefr_level = expression.get('cefr_level', 'B1')
        cefr_source = expression.get('cefr_source', 'default')
        
        if language == 'english':
            # For English, prioritize B1-B2 level (intermediate)
            if cefr_level == 'B1':
                priority += 2
            elif cefr_level == 'B2':
                priority += 3
            elif cefr_level == 'C1':
                priority += 1
            elif cefr_level in ['A1', 'A2']:
                priority -= 2  # Too basic
            
            # Boost for words NOT in common datasets (specialized vocabulary)
            if cefr_source == 'default':
                priority += 1
        
        # Context-based adjustments
        expression_text = expression.get('expression', '').lower()
        
        # Gaming/VTuber context boost
        gaming_keywords = ['game', 'stream', 'play', 'boss', 'franchise', 'customer', 'order']
        if any(keyword in expression_text for keyword in gaming_keywords):
            priority += 1
        
        # Multi-word expressions get a boost
        if len(expression_text.split()) > 1:
            priority += 1
        
        return min(max(priority, 1), 10)  # Clamp between 1-10
    
    def _sort_by_priority(self, expressions: List[Dict]) -> List[Dict]:
        """Sort expressions by educational priority"""
        def get_numeric_difficulty(expr):
            diff = expr.get('difficulty', 3)
            if isinstance(diff, str):
                # Convert string difficulty to numeric
                if diff.startswith('N'):
                    return {'N5': 1, 'N4': 2, 'N3': 3, 'N2': 4, 'N1': 5}.get(diff, 3)
                else:
                    return {'A1': 1, 'A2': 2, 'B1': 3, 'B2': 4, 'C1': 5, 'C2': 6}.get(diff, 3)
            return diff
        
        return sorted(expressions, key=lambda x: (x.get('priority', 5), -get_numeric_difficulty(x)), reverse=True)
    
    def _generate_cache_key(self, text: str, language: Optional[str]) -> str:
        """Generate cache key for text and language combination"""
        content = f"{text}:{language or 'auto'}"
        return f"nlp_vocab:{hashlib.md5(content.encode()).hexdigest()}"
    
    def _get_from_cache(self, key: str) -> Optional[List[Dict]]:
        """Get cached result if available"""
        if not self.cache:
            return None
        
        try:
            cached = self.cache.get(key)
            if cached:
                return json.loads(cached)
        except Exception as e:
            logger.error(f"Cache retrieval error: {str(e)}")
        
        return None
    
    def _save_to_cache(self, key: str, data: List[Dict]):
        """Save result to cache"""
        if not self.cache:
            return
        
        try:
            self.cache.setex(key, self.cache_ttl, json.dumps(data))
        except Exception as e:
            logger.error(f"Cache save error: {str(e)}")
    
    async def extract_from_conversation_enhanced(
        self, 
        transcript: str, 
        context: Optional[Dict] = None,
        user_id: Optional[int] = None
    ) -> List[VocabularyModel]:
        """
        Enhanced extraction using NLP for conversation transcripts
        """
        # Use NLP extraction
        target_language = None
        if context:
            target_language = context.get('target_language')
        
        nlp_expressions = await self.extract_from_text_nlp(transcript, target_language)
        
        # Convert to VocabularyModel format
        vocabulary_items = []
        for expr in nlp_expressions[:50]:  # Limit to top 50
            # Prepare fields based on expression data
            if expr.get('language') == 'english':
                english_text = expr['expression']
                japanese_text = expr.get('meaning', '')
            else:
                japanese_text = expr['expression']
                english_text = expr.get('meaning', '')
            
            vocab_item = VocabularyModel(
                japanese_text=japanese_text,
                english_text=english_text,
                reading=expr.get('reading', ''),
                difficulty_level=expr.get('difficulty', 3),
                context=expr.get('sentence', expr.get('context', '')),
                tags=[expr.get('category', 'general'), expr.get('type', 'vocabulary')],
                source='conversation',
                source_language=expr.get('language', 'mixed'),
                notes=self._generate_learning_notes(expr),
                created_at=datetime.utcnow()
            )
            
            # Add metadata
            if context:
                vocab_item.source_video_id = context.get('video_id')
                vocab_item.video_timestamp = context.get('timestamp')
            
            # Generate ID
            vocab_item.id = self._generate_vocabulary_id(japanese_text, english_text)
            
            vocabulary_items.append(vocab_item)
        
        return vocabulary_items
    
    def _generate_learning_notes(self, expression: Dict) -> str:
        """Generate helpful learning notes for the expression"""
        notes = []
        
        # Add type information
        expr_type = expression.get('type', '')
        if expr_type == 'phrasal_verb':
            notes.append(f"Phrasal verb: {expression.get('lemma', '')} + {expression.get('particle', '')}")
        elif expr_type == 'collocation':
            notes.append(f"Common collocation with '{expression.get('root', '')}'")
        elif expr_type == 'idiom':
            notes.append("Idiomatic expression - meaning may not be literal")
        
        # Add CEFR information
        if expression.get('cefr_level'):
            notes.append(f"CEFR Level: {expression['cefr_level']}")
            if expression.get('cefr_source') == 'oxford_3000':
                notes.append("Oxford 3000 - Essential word to know!")
        
        # Add usage context
        if expression.get('extraction_method') == 'nlp':
            notes.append("Extracted using advanced NLP analysis")
        
        return " | ".join(notes) if notes else ""


# Create singleton instance
nlp_extractor = NLPVocabularyExtractor()