"""
Simple caching service with Redis and in-memory fallback
"""

import json
import logging
from typing import Any, Optional, Dict
from datetime import datetime, timedelta
import hashlib

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    redis = None

from app.core.config import settings

logger = logging.getLogger(__name__)


class CacheService:
    """
    Caching service with Redis support and in-memory fallback
    """
    
    def __init__(self):
        self.redis_client = None
        self.memory_cache: Dict[str, Dict[str, Any]] = {}
        self.default_ttl = 86400  # 24 hours
        
        # Initialize Redis if available
        if REDIS_AVAILABLE:
            self._init_redis()
    
    def _init_redis(self):
        """Initialize Redis connection"""
        try:
            self.redis_client = redis.Redis(
                host=getattr(settings, 'REDIS_HOST', 'localhost'),
                port=getattr(settings, 'REDIS_PORT', 6379),
                db=getattr(settings, 'REDIS_DB', 0),
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5
            )
            # Test connection
            self.redis_client.ping()
            logger.info("Redis cache initialized successfully")
        except Exception as e:
            logger.warning(f"Redis initialization failed: {str(e)}. Using in-memory cache.")
            self.redis_client = None
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        # Try Redis first
        if self.redis_client:
            try:
                value = self.redis_client.get(key)
                if value:
                    return json.loads(value)
            except Exception as e:
                logger.error(f"Redis get error: {str(e)}")
        
        # Fallback to memory cache
        if key in self.memory_cache:
            entry = self.memory_cache[key]
            if entry['expires_at'] > datetime.utcnow():
                return entry['value']
            else:
                # Clean up expired entry
                del self.memory_cache[key]
        
        return None
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None):
        """Set value in cache with TTL"""
        ttl = ttl or self.default_ttl
        
        # Try Redis first
        if self.redis_client:
            try:
                self.redis_client.setex(key, ttl, json.dumps(value))
                return
            except Exception as e:
                logger.error(f"Redis set error: {str(e)}")
        
        # Fallback to memory cache
        self.memory_cache[key] = {
            'value': value,
            'expires_at': datetime.utcnow() + timedelta(seconds=ttl)
        }
        
        # Clean up old entries if memory cache gets too large
        if len(self.memory_cache) > 1000:
            self._cleanup_memory_cache()
    
    def delete(self, key: str):
        """Delete value from cache"""
        # Try Redis first
        if self.redis_client:
            try:
                self.redis_client.delete(key)
            except Exception as e:
                logger.error(f"Redis delete error: {str(e)}")
        
        # Also delete from memory cache
        if key in self.memory_cache:
            del self.memory_cache[key]
    
    def clear_pattern(self, pattern: str):
        """Clear all keys matching pattern"""
        if self.redis_client:
            try:
                keys = self.redis_client.keys(pattern)
                if keys:
                    self.redis_client.delete(*keys)
            except Exception as e:
                logger.error(f"Redis clear pattern error: {str(e)}")
        
        # Clear from memory cache
        keys_to_delete = [k for k in self.memory_cache.keys() if pattern.replace('*', '') in k]
        for key in keys_to_delete:
            del self.memory_cache[key]
    
    def _cleanup_memory_cache(self):
        """Remove expired entries from memory cache"""
        now = datetime.utcnow()
        expired_keys = [k for k, v in self.memory_cache.items() if v['expires_at'] <= now]
        for key in expired_keys:
            del self.memory_cache[key]
        
        # If still too large, remove oldest entries
        if len(self.memory_cache) > 800:
            sorted_keys = sorted(
                self.memory_cache.keys(), 
                key=lambda k: self.memory_cache[k]['expires_at']
            )
            for key in sorted_keys[:200]:  # Remove oldest 200
                del self.memory_cache[key]
    
    @staticmethod
    def generate_key(*args) -> str:
        """Generate cache key from arguments"""
        key_parts = [str(arg) for arg in args]
        key_string = ":".join(key_parts)
        return hashlib.md5(key_string.encode()).hexdigest()
    
    def cached(self, prefix: str, ttl: Optional[int] = None):
        """Decorator for caching function results"""
        def decorator(func):
            async def async_wrapper(*args, **kwargs):
                # Generate cache key
                cache_key = f"{prefix}:{self.generate_key(*args, *kwargs.values())}"
                
                # Check cache
                cached_value = self.get(cache_key)
                if cached_value is not None:
                    return cached_value
                
                # Call function
                result = await func(*args, **kwargs)
                
                # Cache result
                self.set(cache_key, result, ttl)
                
                return result
            
            def sync_wrapper(*args, **kwargs):
                # Generate cache key
                cache_key = f"{prefix}:{self.generate_key(*args, *kwargs.values())}"
                
                # Check cache
                cached_value = self.get(cache_key)
                if cached_value is not None:
                    return cached_value
                
                # Call function
                result = func(*args, **kwargs)
                
                # Cache result
                self.set(cache_key, result, ttl)
                
                return result
            
            # Return appropriate wrapper based on function type
            import inspect
            if inspect.iscoroutinefunction(func):
                return async_wrapper
            else:
                return sync_wrapper
        
        return decorator


# Singleton instance
cache_service = CacheService()