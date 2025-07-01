"""
Rate limiter for API calls to prevent abuse and manage costs
"""

import asyncio
from datetime import datetime, timedelta
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)


class RateLimiter:
    """Token bucket rate limiter for API calls"""
    
    def __init__(self, 
                 requests_per_minute: int = 60,
                 requests_per_hour: int = 1000,
                 burst_size: int = 10):
        self.requests_per_minute = requests_per_minute
        self.requests_per_hour = requests_per_hour
        self.burst_size = burst_size
        
        # Client tracking
        self.client_buckets: Dict[str, TokenBucket] = {}
        
        # Global rate limit
        self.global_bucket = TokenBucket(
            capacity=requests_per_hour,
            refill_rate=requests_per_hour / 3600,  # per second
            burst_size=burst_size
        )
        
    async def check_rate_limit(self, client_id: str) -> bool:
        """Check if request is allowed under rate limits"""
        
        # Get or create client bucket
        if client_id not in self.client_buckets:
            self.client_buckets[client_id] = TokenBucket(
                capacity=self.requests_per_minute,
                refill_rate=self.requests_per_minute / 60,  # per second
                burst_size=self.burst_size
            )
        
        client_bucket = self.client_buckets[client_id]
        
        # Check both client and global limits
        client_allowed = await client_bucket.consume(1)
        global_allowed = await self.global_bucket.consume(1)
        
        if not client_allowed:
            logger.warning(f"Client {client_id} exceeded rate limit")
            return False
            
        if not global_allowed:
            logger.warning("Global rate limit exceeded")
            # Refund the client token since global failed
            await client_bucket.add_tokens(1)
            return False
            
        return True
    
    def get_retry_after(self, client_id: str) -> int:
        """Get seconds until rate limit resets"""
        if client_id in self.client_buckets:
            return self.client_buckets[client_id].get_retry_after()
        return 0
    
    def cleanup_inactive_clients(self, inactive_threshold_minutes: int = 30):
        """Remove inactive client buckets to save memory"""
        current_time = datetime.utcnow()
        inactive_threshold = timedelta(minutes=inactive_threshold_minutes)
        
        clients_to_remove = []
        for client_id, bucket in self.client_buckets.items():
            if current_time - bucket.last_update > inactive_threshold:
                clients_to_remove.append(client_id)
        
        for client_id in clients_to_remove:
            del self.client_buckets[client_id]
            
        if clients_to_remove:
            logger.info(f"Cleaned up {len(clients_to_remove)} inactive rate limit buckets")


class TokenBucket:
    """Token bucket implementation for rate limiting"""
    
    def __init__(self, capacity: float, refill_rate: float, burst_size: int = 0):
        self.capacity = capacity
        self.refill_rate = refill_rate  # tokens per second
        self.burst_size = burst_size
        
        self.tokens = capacity
        self.last_update = datetime.utcnow()
        self.lock = asyncio.Lock()
        
    async def consume(self, tokens: int = 1) -> bool:
        """Try to consume tokens from the bucket"""
        async with self.lock:
            await self._refill()
            
            if self.tokens >= tokens:
                self.tokens -= tokens
                return True
            return False
    
    async def add_tokens(self, tokens: int):
        """Add tokens back to the bucket (for refunds)"""
        async with self.lock:
            self.tokens = min(self.tokens + tokens, self.capacity + self.burst_size)
    
    async def _refill(self):
        """Refill tokens based on elapsed time"""
        current_time = datetime.utcnow()
        elapsed = (current_time - self.last_update).total_seconds()
        
        tokens_to_add = elapsed * self.refill_rate
        self.tokens = min(self.tokens + tokens_to_add, self.capacity + self.burst_size)
        self.last_update = current_time
    
    def get_retry_after(self) -> int:
        """Get seconds until at least one token is available"""
        if self.tokens >= 1:
            return 0
            
        tokens_needed = 1 - self.tokens
        seconds_needed = tokens_needed / self.refill_rate
        return int(seconds_needed) + 1  # Round up


# Global rate limiter instance
rate_limiter = RateLimiter(
    requests_per_minute=30,  # Conservative for free tier
    requests_per_hour=500,
    burst_size=5
)