"""Garmin Connect API integration for importing fitness data."""
import os
import json
import requests
from datetime import datetime, timedelta
from typing import Optional, List, Dict
import httpx

# Garmin OAuth endpoints
GARMIN_AUTH_URL = "https://connect.garmin.com/oauthserver/oauth/authorize"
GARMIN_TOKEN_URL = "https://connect.garmin.com/oauthserver/oauth/token"
GARMIN_API_BASE = "https://connect.garmin.com/api/v1"

class GarminConnectService:
    """Service for integrating with Garmin Connect."""
    
    def __init__(self, client_id: str = None, client_secret: str = None, redirect_uri: str = None):
        """Initialize Garmin service with OAuth credentials."""
        self.client_id = client_id or os.getenv("GARMIN_CLIENT_ID")
        self.client_secret = client_secret or os.getenv("GARMIN_CLIENT_SECRET")
        self.redirect_uri = redirect_uri or os.getenv("GARMIN_REDIRECT_URI", "http://localhost:3001/fitness")
    
    def get_authorize_url(self, state: str) -> str:
        """Get the Garmin OAuth authorization URL."""
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "state": state,
            "scope": "activities:read"
        }
        base_url = GARMIN_AUTH_URL
        query_string = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{base_url}?{query_string}"
    
    async def exchange_code_for_token(self, auth_code: str) -> Optional[Dict]:
        """Exchange authorization code for access token."""
        payload = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": auth_code,
            "grant_type": "authorization_code",
            "redirect_uri": self.redirect_uri
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(GARMIN_TOKEN_URL, data=payload)
                if response.status_code == 200:
                    return response.json()
                else:
                    print(f"Garmin token exchange failed: {response.status_code} {response.text}")
                    return None
        except Exception as e:
            print(f"Error exchanging code for token: {e}")
            return None
    
    async def get_activities(self, access_token: str, limit: int = 50, start: int = 0) -> List[Dict]:
        """Fetch activities from Garmin Connect."""
        headers = {
            "Authorization": f"Bearer {access_token}"
        }
        
        url = f"{GARMIN_API_BASE}/userprofile-service/userprofile/dist/activities"
        params = {
            "limit": limit,
            "start": start
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers, params=params)
                if response.status_code == 200:
                    return response.json().get("activities", [])
                else:
                    print(f"Failed to get activities: {response.status_code}")
                    return []
        except Exception as e:
            print(f"Error fetching activities: {e}")
            return []
    
    async def get_activity_details(self, activity_id: str, access_token: str) -> Optional[Dict]:
        """Fetch detailed information about a specific activity."""
        headers = {
            "Authorization": f"Bearer {access_token}"
        }
        
        url = f"{GARMIN_API_BASE}/activities/{activity_id}/details"
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers)
                if response.status_code == 200:
                    return response.json()
                else:
                    print(f"Failed to get activity details: {response.status_code}")
                    return None
        except Exception as e:
            print(f"Error fetching activity details: {e}")
            return None
    
    @staticmethod
    def parse_activity_to_hike(activity: Dict, user_id: int, trail_id: Optional[int] = None) -> Dict:
        """Convert a Garmin activity to a hike record."""
        # Only process running and hiking activities
        activity_type = activity.get("activityType", {}).get("typeKey", "").lower()
        if activity_type not in ["running", "hiking", "trail_running", "outdoor_running"]:
            return None
        
        start_time = activity.get("startTimeInSeconds", 0)
        duration_seconds = activity.get("duration", 0)
        distance_meters = activity.get("distance", 0)
        elevation_gain = activity.get("elevationGain", 0)
        calories = activity.get("calories", 0)
        
        # Convert to our format
        hike = {
            "user_id": user_id,
            "trail_id": trail_id,
            "hike_date": datetime.fromtimestamp(start_time / 1000),  # Garmin uses milliseconds
            "duration_minutes": int(duration_seconds / 60),
            "distance_miles": distance_meters / 1609.34 if distance_meters else None,  # meters to miles
            "elevation_gain": int(elevation_gain) if elevation_gain else None,
            "calories": int(calories) if calories else None,
            "avg_pace": activity.get("avgPace"),  # min/mi
            "notes": f"Imported from Garmin: {activity.get('activityName', 'Activity')}",
            "difficulty_experienced": "moderate",  # Default; user can adjust
            "fitness_tracker_source": "garmin"
        }
        
        return hike
    
    @staticmethod
    def filter_hiking_activities(activities: List[Dict]) -> List[Dict]:
        """Filter activities to only include hiking/running activities."""
        hiking_types = ["running", "hiking", "trail_running", "outdoor_running"]
        return [
            act for act in activities
            if act.get("activityType", {}).get("typeKey", "").lower() in hiking_types
        ]


# Default instance
garmin_service = GarminConnectService()
