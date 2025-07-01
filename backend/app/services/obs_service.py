"""
OBS WebSocket integration for streaming automation
"""

import asyncio
import json
import logging
from typing import Dict, Optional
import obsws_python as obs

from app.core.config import settings

logger = logging.getLogger(__name__)


class OBSService:
    """Manages OBS Studio integration via WebSocket"""
    
    def __init__(self):
        self.client = None
        self.connected = False
        self.current_scene = None
        
    async def connect(self):
        """Connect to OBS WebSocket"""
        try:
            self.client = obs.ReqClient(
                host=settings.OBS_WEBSOCKET_HOST,
                port=settings.OBS_WEBSOCKET_PORT,
                password=settings.OBS_WEBSOCKET_PASSWORD
            )
            self.connected = True
            logger.info("Connected to OBS WebSocket")
            
            # Get current scene
            response = self.client.get_current_program_scene()
            self.current_scene = response.current_program_scene_name
            
        except Exception as e:
            logger.error(f"Failed to connect to OBS: {str(e)}")
            self.connected = False
            
    def disconnect(self):
        """Disconnect from OBS WebSocket"""
        if self.client:
            self.client = None
            self.connected = False
            logger.info("Disconnected from OBS WebSocket")
            
    async def switch_scene(self, scene_name: str):
        """Switch to a specific scene"""
        if not self.connected:
            return False
            
        try:
            self.client.set_current_program_scene(scene_name)
            self.current_scene = scene_name
            logger.info(f"Switched to scene: {scene_name}")
            return True
        except Exception as e:
            logger.error(f"Failed to switch scene: {str(e)}")
            return False
            
    async def toggle_source_visibility(self, source_name: str, visible: bool):
        """Toggle visibility of a source"""
        if not self.connected:
            return False
            
        try:
            self.client.set_scene_item_enabled(
                scene_name=self.current_scene,
                item_name=source_name,
                item_enabled=visible
            )
            logger.info(f"Set {source_name} visibility to {visible}")
            return True
        except Exception as e:
            logger.error(f"Failed to toggle source visibility: {str(e)}")
            return False
            
    async def update_browser_source_url(self, source_name: str, url: str):
        """Update URL of a browser source"""
        if not self.connected:
            return False
            
        try:
            # Get source settings
            response = self.client.get_input_settings(source_name)
            settings = response.input_settings
            
            # Update URL
            settings['url'] = url
            
            # Apply new settings
            self.client.set_input_settings(
                input_name=source_name,
                input_settings=settings
            )
            
            logger.info(f"Updated {source_name} URL to {url}")
            return True
        except Exception as e:
            logger.error(f"Failed to update browser source: {str(e)}")
            return False
            
    async def start_recording(self):
        """Start OBS recording"""
        if not self.connected:
            return False
            
        try:
            self.client.start_record()
            logger.info("Started OBS recording")
            return True
        except Exception as e:
            logger.error(f"Failed to start recording: {str(e)}")
            return False
            
    async def stop_recording(self):
        """Stop OBS recording"""
        if not self.connected:
            return False
            
        try:
            response = self.client.stop_record()
            logger.info(f"Stopped OBS recording: {response.output_path}")
            return response.output_path
        except Exception as e:
            logger.error(f"Failed to stop recording: {str(e)}")
            return None
            
    async def create_scene_for_video_analysis(self, video_id: str):
        """Create a custom scene for analyzing a specific video"""
        if not self.connected:
            return False
            
        scene_name = f"Video_Analysis_{video_id}"
        
        try:
            # Create new scene
            self.client.create_scene(scene_name)
            
            # Add browser source for AIVlingual overlay
            self.client.create_input(
                scene_name=scene_name,
                input_name="AIVlingual_Overlay",
                input_kind="browser_source",
                input_settings={
                    "url": f"http://localhost:3000/obs-mode?video={video_id}",
                    "width": 1920,
                    "height": 1080,
                    "css": "body { background: transparent; }"
                }
            )
            
            # Add window capture for YouTube
            self.client.create_input(
                scene_name=scene_name,
                input_name="YouTube_Window",
                input_kind="window_capture",
                input_settings={
                    "window": "YouTube - Google Chrome"  # Adjust based on browser
                }
            )
            
            logger.info(f"Created scene for video analysis: {scene_name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to create scene: {str(e)}")
            return False
            
    def get_recording_status(self) -> Dict:
        """Get current recording status"""
        if not self.connected:
            return {"recording": False, "paused": False, "duration": 0}
            
        try:
            response = self.client.get_record_status()
            return {
                "recording": response.output_active,
                "paused": response.output_paused,
                "duration": response.output_duration,
                "bytes": response.output_bytes
            }
        except Exception as e:
            logger.error(f"Failed to get recording status: {str(e)}")
            return {"recording": False, "paused": False, "duration": 0}


# Global OBS service instance
obs_service = OBSService()