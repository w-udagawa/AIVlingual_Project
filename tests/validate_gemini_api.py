#!/usr/bin/env python3
"""
Gemini API Key Validation Script
This script validates the Gemini API key and tests the connection
"""

import os
import sys
import asyncio
from pathlib import Path
from dotenv import load_dotenv

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

# Load environment variables
env_path = Path(__file__).parent.parent / "backend" / ".env"
load_dotenv(env_path)

import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold

async def validate_gemini_api():
    """Validate Gemini API key and test connection"""
    print("🔍 Gemini API Validation Script\n")
    
    # Check API key
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("❌ GEMINI_API_KEY not found in environment variables")
        print(f"   Checked path: {env_path}")
        return False
    
    # Mask API key for display
    masked_key = api_key[:8] + "..." + api_key[-4:] if len(api_key) > 12 else "***"
    print(f"✅ API Key found: {masked_key}")
    
    # Configure Gemini
    try:
        genai.configure(api_key=api_key)
        print("✅ Gemini API configured successfully")
    except Exception as e:
        print(f"❌ Failed to configure Gemini API: {e}")
        return False
    
    # Test API connection
    print("\n📡 Testing API connection...")
    try:
        model = genai.GenerativeModel(
            model_name="gemini-2.0-flash-exp",
            generation_config={
                "temperature": 0.7,
                "top_p": 0.95,
                "top_k": 40,
                "max_output_tokens": 1024,
            },
            safety_settings={
                HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
            }
        )
        
        # Simple test prompt
        test_prompt = "Say 'API connection successful' in Japanese."
        
        # Test regular response
        print("  Testing regular response...")
        response = model.generate_content(test_prompt)
        print(f"  ✅ Regular response: {response.text}")
        
        # Test streaming response
        stream_enabled = os.getenv("STREAM_ENABLED", "false").lower() == "true"
        if stream_enabled:
            print("\n  Testing streaming response...")
            stream_response = model.generate_content(test_prompt, stream=True)
            chunks = []
            for chunk in stream_response:
                if chunk.text:
                    chunks.append(chunk.text)
            print(f"  ✅ Streaming response ({len(chunks)} chunks): {''.join(chunks)}")
        else:
            print("\n  ℹ️ Streaming disabled (STREAM_ENABLED=false)")
        
        # Test with system prompt
        print("\n  Testing with system prompt...")
        chat = model.start_chat(history=[])
        rin_prompt = """You are Rin, a virtual streamer assistant.
Respond briefly in Japanese saying you're ready to help."""
        
        response = chat.send_message(rin_prompt)
        print(f"  ✅ System prompt response: {response.text}")
        
        print("\n✅ All API tests passed!")
        return True
        
    except Exception as e:
        print(f"\n❌ API test failed: {e}")
        print(f"   Error type: {type(e).__name__}")
        
        # Provide specific error guidance
        if "API_KEY_INVALID" in str(e):
            print("\n💡 The API key appears to be invalid.")
            print("   Please check your Gemini API key at: https://makersuite.google.com/app/apikey")
        elif "QUOTA_EXCEEDED" in str(e):
            print("\n💡 API quota exceeded.")
            print("   Check your usage at: https://console.cloud.google.com/")
        elif "model not found" in str(e).lower():
            print("\n💡 The model 'gemini-2.0-flash-exp' may not be available.")
            print("   Try using 'gemini-pro' instead.")
        
        return False

async def check_environment():
    """Check environment configuration"""
    print("\n🔧 Environment Configuration:")
    
    # Check .env file
    if env_path.exists():
        print(f"✅ .env file found: {env_path}")
        
        # Check important variables
        vars_to_check = [
            "GEMINI_API_KEY",
            "STREAM_ENABLED",
            "NOTION_API_KEY",
            "YOUTUBE_API_KEY"
        ]
        
        for var in vars_to_check:
            value = os.getenv(var)
            if value:
                if "KEY" in var:
                    # Mask sensitive values
                    masked = value[:8] + "..." + value[-4:] if len(value) > 12 else "***"
                    print(f"  {var}: {masked}")
                else:
                    print(f"  {var}: {value}")
            else:
                print(f"  {var}: ❌ Not set")
    else:
        print(f"❌ .env file not found at: {env_path}")
        return False
    
    return True

async def main():
    """Main validation function"""
    print("=" * 50)
    print("AIVlingual Gemini API Validation")
    print("=" * 50)
    
    # Check environment
    env_ok = await check_environment()
    if not env_ok:
        print("\n❌ Environment configuration issues found.")
        return
    
    # Validate API
    api_ok = await validate_gemini_api()
    
    if api_ok:
        print("\n✅ Gemini API validation completed successfully!")
        print("\n💡 Next steps:")
        print("   1. If tests are still failing, check the WebSocket connection")
        print("   2. Ensure the backend server is running on port 8000")
        print("   3. Check for any firewall or network issues")
    else:
        print("\n❌ Gemini API validation failed.")
        print("\n💡 Troubleshooting steps:")
        print("   1. Verify your API key is correct")
        print("   2. Check if the API key has proper permissions")
        print("   3. Ensure you have API quota available")
        print("   4. Try regenerating the API key if needed")

if __name__ == "__main__":
    asyncio.run(main())