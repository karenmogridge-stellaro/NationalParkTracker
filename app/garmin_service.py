"""Garmin Connect API integration for importing fitness data."""
import os
import json
from datetime import datetime, timedelta
from typing import Optional, List, Dict
import httpx

# Garmin OAuth endpoints
GARMIN_AUTH_URL = "https://connect.garmin.com/oauthserver/oauth/authorize"
GARMIN_TOKEN_URL = "https://connect.garmin.com/oauthserver/oauth/token"
GARMIN_API_BASE = "https://connect.garmin.com/api/v1"

# Mock mode for testing without real Garmin credentials
MOCK_MODE = os.getenv("GARMIN_MOCK_MODE", "false").lower() == "true"

class GarminConnectService:
    """Service for integrating with Garmin Connect."""
    
    def __init__(self, client_id: str = None, client_secret: str = None, redirect_uri: str = None):
        """Initialize Garmin service with OAuth credentials."""
        self.client_id = client_id or os.getenv("GARMIN_CLIENT_ID", "mock_client_id" if MOCK_MODE else "")
        self.client_secret = client_secret or os.getenv("GARMIN_CLIENT_SECRET", "mock_secret" if MOCK_MODE else "")
        self.redirect_uri = redirect_uri or os.getenv("GARMIN_REDIRECT_URI", "http://localhost:3001/fitness")
        self.mock_mode = MOCK_MODE
    
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
        # Mock mode for testing without real credentials
        if self.mock_mode:
            return {
                "access_token": f"mock_token_{auth_code}",
                "token_type": "Bearer",
                "expires_in": 3600,
                "refresh_token": "mock_refresh_token"
            }
        
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
        # Mock mode for testing without real credentials
        if self.mock_mode:
            return self._get_mock_activities(limit)
        
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
    
    def _get_mock_activities(self, limit: int = 50) -> List[Dict]:
        """Return mock hiking activities for testing."""
        now = datetime.utcnow()
        mock_activities = [
            {
                "activityId": 1234567890,
                "activityName": "Morning Hike - Mountain Peak",
                "startTimeInSeconds": int((now - timedelta(days=7)).timestamp()),
                "durationInSeconds": 3600000,  # 1 hour in milliseconds
                "distance": 8000,  # 8 km
                "elevationGain": 400,  # 400 meters
                "calories": 385,
                "activityType": {"typeKey": "hiking"},
                "avgPace": 450  # seconds per km
            },
            {
                "activityId": 1234567891,
                "activityName": "Trail Run - Sunset Vista",
                "startTimeInSeconds": int((now - timedelta(days=5)).timestamp()),
                "durationInSeconds": 2400000,  # 40 min
                "distance": 7200,  # 7.2 km
                "elevationGain": 250,
                "calories": 420,
                "activityType": {"typeKey": "trail_running"},
                "avgPace": 333
            },
            {
                "activityId": 1234567892,
                "activityName": "Weekend Hiking - Forest Trail",
                "startTimeInSeconds": int((now - timedelta(days=2)).timestamp()),
                "durationInSeconds": 5400000,  # 1.5 hours
                "distance": 12000,  # 12 km
                "elevationGain": 600,
                "calories": 520,
                "activityType": {"typeKey": "hiking"},
                "avgPace": 450
            },
            {
                "activityId": 1234567893,
                "activityName": "Evening Run - Urban Park",
                "startTimeInSeconds": int((now - timedelta(days=1)).timestamp()),
                "durationInSeconds": 1800000,  # 30 min
                "distance": 5000,  # 5 km
                "elevationGain": 100,
                "calories": 310,
                "activityType": {"typeKey": "running"},
                "avgPace": 360
            },
        ]
        return mock_activities[:limit]
    
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

        # Support multiple activity payload formats (Garmin real API vs. mock)
        start_time = activity.get("startTimeInSeconds") or activity.get("start_time") or 0
        # start_time may be in seconds or milliseconds - normalize to seconds
        try:
            start_time = int(start_time)
        except Exception:
            start_time = 0

        # duration may be provided as 'duration' (seconds) or 'durationInSeconds' (ms in our mock)
        duration_seconds = activity.get("duration") or activity.get("durationInSeconds") or 0
        try:
            duration_seconds = int(duration_seconds)
        except Exception:
            duration_seconds = 0

        # If duration looks like milliseconds (greater than 1e6), convert to seconds
        if duration_seconds > 1_000_000:
            duration_seconds = int(duration_seconds / 1000)

        distance_meters = activity.get("distance", 0) or activity.get("distance_meters", 0)
        elevation_gain = activity.get("elevationGain", 0) or activity.get("elevation_gain", 0)
        calories = activity.get("calories", 0)
        
        # Convert to our format
        # Normalize start_time to a Unix timestamp in seconds
        if start_time > 1_000_000_000_000:
            # milliseconds
            hike_datetime = datetime.fromtimestamp(start_time / 1000)
        elif start_time > 1_000_000_000:
            # already seconds
            hike_datetime = datetime.fromtimestamp(start_time)
        else:
            hike_datetime = datetime.utcnow()

        hike = {
            "user_id": user_id,
            "trail_id": trail_id,
            "hike_date": hike_datetime,
            "duration_minutes": int(duration_seconds / 60) if duration_seconds else None,
            "distance_miles": round(distance_meters / 1609.34, 2) if distance_meters else None,
            "elevation_gain": int(elevation_gain) if elevation_gain else None,
            "calories": int(calories) if calories else None,
            "avg_pace": activity.get("avgPace") or activity.get("avg_pace"),
            "notes": f"Imported from Garmin: {activity.get('activityName', activity.get('activityName', 'Activity'))}",
            "difficulty_experienced": "moderate",
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
