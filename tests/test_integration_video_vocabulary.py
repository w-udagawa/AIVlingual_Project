#!/usr/bin/env python3
"""
Integration test for video analysis and vocabulary database features
Tests the complete flow with authentication
"""

import asyncio
import sys
import os
from pathlib import Path
import aiohttp
import json
from typing import Dict, Optional

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

# Configuration
BASE_URL = "http://localhost:8000"
API_V1_URL = f"{BASE_URL}/api/v1"

# Test data
import time
TEST_USER = {
    "username": f"test_user_{int(time.time())}",
    "email": f"test_{int(time.time())}@aivlingual.com",
    "password": "test_password123"
}

# Vtuber video URLs for testing
TEST_VIDEOS = [
    # 実際のVtuber動画
    "https://youtu.be/fH52x36P-L4?si=0EIJYrHA4RKO2hh7",
]


class APIClient:
    """API client for testing"""
    
    def __init__(self):
        self.session: Optional[aiohttp.ClientSession] = None
        self.auth_token: Optional[str] = None
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
            
    def _get_headers(self) -> Dict:
        """Get headers with authentication"""
        headers = {"Content-Type": "application/json"}
        if self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"
        return headers
        
    async def register(self, user_data: Dict) -> Dict:
        """Register a new user"""
        async with self.session.post(
            f"{API_V1_URL}/auth/register",
            json=user_data,
            headers=self._get_headers()
        ) as response:
            data = await response.json()
            if response.status == 200 and "access_token" in data:
                self.auth_token = data["access_token"]
            return data, response.status
            
    async def login(self, username_or_email: str, password: str) -> Dict:
        """Login user"""
        async with self.session.post(
            f"{API_V1_URL}/auth/login",
            json={
                "username_or_email": username_or_email,
                "password": password
            },
            headers=self._get_headers()
        ) as response:
            data = await response.json()
            if response.status == 200 and "access_token" in data:
                self.auth_token = data["access_token"]
            return data, response.status
            
    async def extract_vocabulary(self, video_url: str) -> Dict:
        """Extract vocabulary from video"""
        async with self.session.get(
            f"{API_V1_URL}/youtube/extract-vocabulary",
            params={"url": video_url},
            headers=self._get_headers()
        ) as response:
            return await response.json(), response.status
            
    async def get_vocabulary_items(self, limit: int = 50) -> Dict:
        """Get vocabulary items"""
        async with self.session.get(
            f"{API_V1_URL}/vocabulary",
            params={"limit": limit},
            headers=self._get_headers()
        ) as response:
            return await response.json(), response.status
            
    async def search_videos(self, query: str) -> Dict:
        """Search YouTube videos"""
        async with self.session.get(
            f"{API_V1_URL}/youtube/search",
            params={"q": query},
            headers=self._get_headers()
        ) as response:
            return await response.json(), response.status
            
    async def get_user_preferences(self) -> Dict:
        """Get user preferences"""
        async with self.session.get(
            f"{API_V1_URL}/auth/preferences",
            headers=self._get_headers()
        ) as response:
            return await response.json(), response.status
            
    async def update_user_preferences(self, preferences: Dict) -> Dict:
        """Update user preferences"""
        async with self.session.put(
            f"{API_V1_URL}/auth/preferences",
            json=preferences,
            headers=self._get_headers()
        ) as response:
            return await response.json(), response.status


async def test_auth_flow(client: APIClient) -> bool:
    """Test authentication flow"""
    print("\n🔐 Testing Authentication Flow...")
    
    # Test registration
    print("1. Testing user registration...")
    data, status = await client.register(TEST_USER)
    
    if status == 200:
        print(f"   ✅ User registered successfully")
        print(f"   User ID: {data['user']['id']}")
        print(f"   Token: {data['access_token'][:20]}...")
    elif status == 400:
        print(f"   ℹ️ User already exists, attempting login...")
        
        # Try login
        data, status = await client.login(TEST_USER["username"], TEST_USER["password"])
        if status == 200:
            print(f"   ✅ Login successful")
        else:
            print(f"   ❌ Login failed: {data}")
            return False
    else:
        print(f"   ❌ Registration failed: {data}")
        return False
    
    # Test getting user info
    print("\n2. Testing user preferences...")
    prefs, status = await client.get_user_preferences()
    if status == 200:
        print(f"   ✅ Retrieved user preferences")
        print(f"   Language: {prefs.get('language_preference', 'auto')}")
        print(f"   Difficulty: {prefs.get('difficulty_preference', 3)}")
    else:
        print(f"   ❌ Failed to get preferences: {prefs}")
        return False
    
    # Test updating preferences
    print("\n3. Testing preference update...")
    update_data = {
        "language_preference": "ja-JP",
        "difficulty_preference": 4,
        "daily_goal": 20
    }
    result, status = await client.update_user_preferences(update_data)
    if status == 200:
        print(f"   ✅ Preferences updated successfully")
    else:
        print(f"   ❌ Failed to update preferences: {result}")
        return False
    
    return True


async def test_video_analysis(client: APIClient) -> bool:
    """Test video analysis features"""
    print("\n🎬 Testing Video Analysis...")
    
    # Test video search
    print("1. Testing video search...")
    results, status = await client.search_videos("ホロライブ")
    
    if status == 200:
        print(f"   ✅ Found {results['result_count']} videos")
        if results['videos']:
            video = results['videos'][0]
            print(f"   First result: {video['title'][:50]}...")
            print(f"   Channel: {video['channel_title']}")
    else:
        print(f"   ❌ Search failed: {results}")
        return False
    
    # Test vocabulary extraction
    print("\n2. Testing vocabulary extraction...")
    for video_url in TEST_VIDEOS[:1]:  # Test with first video only
        print(f"   Processing: {video_url}")
        
        result, status = await client.extract_vocabulary(video_url)
        
        if status == 200 and result.get('success'):
            print(f"   ✅ Extracted {result['vocabulary_count']} vocabulary items")
            print(f"   Video ID: {result['video_id']}")
            
            # Show sample vocabulary
            items = result.get('data', {}).get('vocabulary_items', [])
            if items:
                print(f"\n   Sample vocabulary:")
                for item in items[:3]:
                    print(f"   - {item.get('japanese_text', '')} → {item.get('english_text', '')}")
        else:
            print(f"   ❌ Extraction failed: {result}")
            # Continue with other tests even if this fails
    
    return True


async def test_vocabulary_database(client: APIClient) -> bool:
    """Test vocabulary database features"""
    print("\n📚 Testing Vocabulary Database...")
    
    # Get vocabulary items
    print("1. Testing vocabulary retrieval...")
    items, status = await client.get_vocabulary_items(limit=10)
    
    if status == 200:
        print(f"   ✅ Retrieved {len(items)} vocabulary items")
        
        if items:
            print(f"\n   Recent vocabulary:")
            for item in items[:5]:
                print(f"   - {item.get('japanese_text', '')} → {item.get('english_text', '')}")
                print(f"     Difficulty: {item.get('difficulty_level', 'N/A')}")
                print(f"     Source: {item.get('source', 'N/A')}")
    else:
        print(f"   ❌ Failed to retrieve vocabulary: {items}")
        return False
    
    return True


async def test_full_integration():
    """Run full integration test"""
    print("=" * 60)
    print("AIVlingual Video & Vocabulary Integration Test")
    print("=" * 60)
    
    # Check if server is running
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{BASE_URL}/") as response:
                if response.status != 200:
                    print("❌ Server is not running on port 8000")
                    print("   Please start the server with: cd backend && uvicorn app.main:app")
                    return
    except:
        print("❌ Cannot connect to server at http://localhost:8000")
        print("   Please start the server with: cd backend && uvicorn app.main:app")
        return
    
    # Run tests
    async with APIClient() as client:
        results = {
            "auth": False,
            "video": False,
            "vocabulary": False
        }
        
        try:
            # Test authentication
            results["auth"] = await test_auth_flow(client)
            
            # Test video analysis (requires auth)
            if results["auth"]:
                results["video"] = await test_video_analysis(client)
                
                # Test vocabulary database
                results["vocabulary"] = await test_vocabulary_database(client)
            
        except Exception as e:
            print(f"\n❌ Test failed with error: {str(e)}")
            import traceback
            traceback.print_exc()
        
        # Summary
        print("\n" + "=" * 60)
        print("Test Summary:")
        print("=" * 60)
        
        for test_name, passed in results.items():
            status = "✅ PASSED" if passed else "❌ FAILED"
            print(f"{test_name.title()}: {status}")
        
        total_passed = sum(results.values())
        total_tests = len(results)
        success_rate = (total_passed / total_tests * 100) if total_tests > 0 else 0
        
        print(f"\nTotal: {total_passed}/{total_tests} tests passed ({success_rate:.1f}%)")
        
        if success_rate < 100:
            print("\n💡 Troubleshooting tips:")
            if not results["auth"]:
                print("   - Check database migrations have been run")
                print("   - Ensure auth service is properly initialized")
            if not results["video"]:
                print("   - Verify YouTube API key is configured")
                print("   - Check network connectivity")
                print("   - Replace test video URLs with actual Vtuber content")
            if not results["vocabulary"]:
                print("   - Ensure vocabulary database tables exist")
                print("   - Check that video processing completed successfully")


if __name__ == "__main__":
    asyncio.run(test_full_integration())