#!/usr/bin/env python3
"""
Test script for batch processing functionality
"""

import asyncio
import httpx
import json
import time

# Test URLs - mix of valid and invalid for testing
TEST_URLS = [
    "https://www.youtube.com/watch?v=-OtrDCWy9Co",  # Valid Vtuber clip
    "https://youtu.be/dQw4w9WgXcQ",  # Valid format
    "https://www.youtube.com/watch?v=INVALID_ID",  # Invalid video ID
]

async def test_batch_processing():
    """Test the batch processing endpoint"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        print("Starting batch processing test...")
        
        # 1. Start batch processing
        print(f"\n1. Sending batch request with {len(TEST_URLS)} URLs...")
        response = await client.post(
            "http://localhost:8000/api/v1/youtube/batch-extract",
            json={"urls": TEST_URLS}
        )
        
        if response.status_code != 200:
            print(f"Error: {response.status_code} - {response.text}")
            return
            
        batch_data = response.json()
        batch_id = batch_data["batch_id"]
        print(f"Batch ID: {batch_id}")
        print(f"Message: {batch_data['message']}")
        
        # 2. Poll for status
        print("\n2. Polling for progress...")
        while True:
            await asyncio.sleep(2)  # Poll every 2 seconds
            
            status_response = await client.get(
                f"http://localhost:8000/api/v1/youtube/batch-status/{batch_id}"
            )
            
            if status_response.status_code != 200:
                print(f"Error checking status: {status_response.text}")
                break
                
            status_data = status_response.json()
            progress = status_data["progress"]
            
            print(f"\rProgress: {progress['progress_percentage']:.1f}% "
                  f"(Completed: {progress['completed']}/{progress['total']}, "
                  f"Failed: {progress['failed']})", end="", flush=True)
            
            if progress.get("current_url"):
                print(f"\n   Processing: {progress['current_url']}")
            
            if status_data["status"] == "completed":
                print("\n\n3. Batch processing completed!")
                
                # Display results
                if "results" in status_data:
                    results = status_data["results"]
                    print(f"\nSummary:")
                    print(f"- Total videos: {results['total_videos']}")
                    print(f"- Successful: {results['successful']}")
                    print(f"- Failed: {results['failed']}")
                    print(f"- Total vocabulary extracted: {results['total_vocabulary']}")
                    
                    if results["results"]:
                        print("\nSuccessful extractions:")
                        for r in results["results"]:
                            print(f"  - {r['video_title']}: {r['vocabulary_extracted']} items")
                    
                    if results["errors"]:
                        print("\nErrors:")
                        for e in results["errors"]:
                            print(f"  - {e['url']}: {e['error']}")
                break

if __name__ == "__main__":
    print("AIVlingual Batch Processing Test")
    print("================================")
    asyncio.run(test_batch_processing())