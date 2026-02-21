# Garmin Connect Integration Setup Guide

## Overview
The Garmin Connect integration allows users to import hiking activities from their Garmin fitness trackers into the National Park Tracker application.

## Architecture

### Backend Components

1. **app/garmin_service.py** - Service layer for Garmin OAuth and API
   - `GarminConnectService` class handles OAuth flow and activity fetching
   - Methods: `get_authorize_url()`, `exchange_code_for_token()`, `get_activities()`, `get_activity_details()`
   - Automatically filters for hiking/running activities
   - Converts Garmin activities to TrailHike records

2. **app/models.py** - Database model
   - `GarminAuth` model stores per-user OAuth tokens
   - Fields: access_token, refresh_token, token_expires_at, connected flag
   - One-to-one relationship with User

3. **app/routes.py** - API endpoints (5 total)
   - `GET /users/{user_id}/garmin/auth-url` - Get OAuth authorization URL
   - `POST /users/{user_id}/garmin/token` - Exchange auth code for tokens
   - `GET /users/{user_id}/garmin/status` - Check connection status
   - `POST /users/{user_id}/garmin/import` - Import activities with duplicate detection
   - `DELETE /users/{user_id}/garmin/disconnect` - Disconnect account

### Frontend Components

1. **frontend/src/pages/Fitness.jsx** - Main UI component
   - Connection status display
   - OAuth flow button ("Connect Garmin Account")
   - Import hikes button with loading state
   - Import statistics (hikes, distance, elevation, total activities)
   - Disconnect confirmation dialog

2. **frontend/src/utils/api.js** - API client methods
   - `getGarminAuthUrl(userId)`
   - `saveGarminToken(userId, authCode)`
   - `getGarminStatus(userId)`
   - `importGarminHikes(userId, limit)`
   - `disconnectGarmin(userId)`

## Setup Steps

### 1. Register Garmin Developer Application
1. Go to https://developer.garmin.com/
2. Sign in or create a Garmin account
3. Create a new application:
   - Application Name: "National Park Tracker"
   - Redirect URLs: `http://localhost:3001/fitness` (for local development)
   - For production: Enable HTTPS and use production URL
4. Copy your OAuth credentials:
   - **Client ID**
   - **Client Secret**

### 2. Configure Environment Variables
Create a `.env` file in the project root (or update existing):

```env
GARMIN_CLIENT_ID=your_client_id_here
GARMIN_CLIENT_SECRET=your_client_secret_here
GARMIN_REDIRECT_URI=http://localhost:3001/fitness
```

For production, update `GARMIN_REDIRECT_URI` to your production domain.

### 3. Initialize Database
Ensure you've run migrations to create the GarminAuth table:

```bash
cd NationalParkTracker
python -m app.database  # Or use Alembic if set up
```

### 4. Test Local Setup

**Start Backend:**
```bash
python -m uvicorn app.main:app --reload --port 8001
```

**Start Frontend:**
```bash
cd frontend && npm run dev
```

**Navigate to Fitness Page:**
- Open http://localhost:3001/fitness
- You should see the Fitness Tracker Integration page
- Click "Connect Garmin Account" to start OAuth flow

### 5. Test OAuth Flow
1. Click "Connect Garmin Account"
2. You'll be redirected to Garmin's login page
3. After login, you'll be redirected back to the Fitness page with an auth code
4. The auth code is automatically exchanged for access tokens
5. You should see connection status updated to "Connected"
6. Click "Import Hikes" to fetch your activities

## How It Works

### OAuth Flow
```
User clicks "Connect" 
  → Frontend calls getGarminAuthUrl(userId)
  → Backend generates authorization URL with CSRF state
  → User redirected to Garmin login
  → User grants permissions
  → Garmin redirects back to /fitness with auth_code
  → Frontend extracts auth_code from URL
  → Frontend calls saveGarminToken(userId, authCode)
  → Backend exchanges code for access_token and refresh_token
  → Tokens stored in GarminAuth model
```

### Import Flow
```
User clicks "Import Hikes"
  → Frontend calls importGarminHikes(userId, limit=50)
  → Backend fetches activities from Garmin API
  → Filters for hiking/running activity types
  → Checks for duplicates (via activity_id in TrailHike.notes)
  → Creates new TrailHike records for new activities
  → Calculates statistics (count, distance, elevation)
  → Returns stats to frontend for display
```

### Duplicate Detection
- Imported activities are marked with `fitness_tracker_source="garmin"`
- The activity ID is stored in the notes field
- Before import, the system checks if this activity ID already exists
- Prevents reimporting the same activity multiple times

## Data Mapping

Garmin activities are converted to TrailHike records as follows:

| Garmin Field | TrailHike Field | Notes |
|---|---|---|
| activity.name | hike_name | Activity name from Garmin |
| activity.startTimeInSeconds | hike_date | Converted to datetime |
| activity.duration | hike_duration | Milliseconds converted to minutes |
| activity.distance | hike_distance | Meters converted to miles |
| activity.elevationGain | elevation_gain | In feet |
| activity.calories | calories_burned | Total calories |
| activity.avgPace | avg_pace | Average pace (min/mile) |
| - | fitness_tracker_source | Always "garmin" |
| activity.activityId | notes | Activity ID for duplicate detection |

## Future Enhancements

### Planned Features
1. **Token Refresh** - Automatic refresh when tokens expire
2. **Automatic Sync** - Scheduled imports (cron jobs)
3. **Activity Matching** - Auto-match Garmin activities to park trails
4. **Notifications** - Notify users of imported hikes
5. **Other Platforms**:
   - Strava integration
   - Apple Health integration
   - Fitbit integration

### Token Refresh Implementation
When Garmin returns a token expiration time, implement refresh logic:

```python
async def refresh_garmin_token(garmin_auth: GarminAuth):
    """Refresh expired Garmin tokens"""
    if datetime.utcnow() > garmin_auth.token_expires_at:
        # Call Garmin token refresh endpoint
        # Update GarminAuth with new tokens
        pass
```

### Automatic Sync
Add scheduled task (using APScheduler):

```python
from apscheduler.schedulers.background import BackgroundScheduler

scheduler = BackgroundScheduler()

@app.on_event("startup")
async def startup_event():
    scheduler.add_job(
        sync_garmin_activities,
        "interval",
        hours=6,  # Sync every 6 hours
    )
    scheduler.start()
```

### Activity-to-Trail Matching
Implement fuzzy matching between imported activities and park trails:

```python
def match_activity_to_trail(hike: TrailHike) -> Trail:
    """
    Match imported hike to a park trail using:
    - Name similarity (fuzzy string matching)
    - Location proximity (lat/long if available)
    - Elevation gain/distance similarity
    """
    pass
```

## Troubleshooting

### "Connect Garmin Account" button doesn't work
- Check browser console for errors
- Verify GARMIN_CLIENT_ID is set in backend .env
- Verify GARMIN_REDIRECT_URI matches Garmin app settings

### OAuth redirect returns error
- Check that auth code is in URL query params
- Verify GARMIN_CLIENT_SECRET is correct
- Check Garmin API response status in backend logs

### Import shows 0 activities
- Check that Garmin account has hiking/running activities
- Verify activity types match filter (hiking, running, trail_running, outdoor_running)
- Check that Garmin API tokens are still valid (not expired)

### "Last sync" not updating
- Check that import endpoint was successful (200 status)
- Verify backend is updating GarminAuth.last_sync timestamp

## Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| GARMIN_CLIENT_ID | ✅ Yes | - | OAuth Client ID from Garmin Developer Portal |
| GARMIN_CLIENT_SECRET | ✅ Yes | - | OAuth Client Secret from Garmin Developer Portal |
| GARMIN_REDIRECT_URI | ❌ No | http://localhost:3001/fitness | OAuth redirect URL |
| DATABASE_URL | ✅ Yes | - | Database connection string |
| DEBUG | ❌ No | 0 | Enable debug logging |

## Security Notes

1. **Never commit .env** - Keep OAuth credentials secure
2. **Use HTTPS in production** - OAuth requires secure redirect URIs
3. **Token Storage** - Tokens are stored encrypted in database
4. **CSRF Protection** - State parameter prevents CSRF attacks
5. **Scope Limitation** - Only request necessary Garmin API scopes

## Testing Garmin API Responses

To test locally without a real Garmin account:

```python
# Add mock in garmin_service.py for testing
async def get_activities_mock(self, limit: int = 50):
    return [
        {
            "activityId": "mock_1",
            "activityName": "Morning Hike",
            "startTimeInSeconds": 1704067200,
            "duration": 3600000,  # 1 hour
            "distance": 5000,  # 5 km
            "elevationGain": 300,
            "activityType": {"typeKey": "hiking"},
            "avgPace": 528  # seconds per km
        }
    ]
```

## References

- [Garmin Health API Documentation](https://developer.garmin.com/health-api/overview/)
- [OAuth 2.0 Authorization Code Flow](https://datatracker.ietf.org/doc/html/rfc6749#section-1.3.1)
- [National Park Tracker README](./README.md)
