# National Park Tracker - Testing Guide

## Quick Start

This guide will help you set up and test the National Park Tracker application both locally and in production.

## Prerequisites

- **Python 3.8+** installed
- **Node.js 16+** and npm installed
- **git** installed

## Backend Setup & Testing

### 1. Install Backend Dependencies

```bash
cd /Users/karen.mogridge/VSCodeProjects/NationalParkTracker
pip install -r requirements.txt
```

### 2. Initialize the Database

The database will be automatically initialized when you start the server. It will:
- Create SQLite database at `npt.db`
- Seed initial parks data from `scripts/parks_data.json`
- Create achievement badges

### 3. Start the Backend Server

```bash
# From the project root
python -m uvicorn app.main:app --reload --port 8001
```

The API will be available at: `http://localhost:8001`
- API Docs: `http://localhost:8001/docs` (Swagger UI)
- ReDoc: `http://localhost:8001/redoc`

### 4. Test Backend Endpoints

Using the Swagger UI or curl:

```bash
# Create a user
curl -X POST "http://localhost:8001/api/v1/users" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com"
  }'

# List all parks
curl "http://localhost:8001/api/v1/parks"

# Get user by email
curl "http://localhost:8001/api/v1/users/email/john@example.com"

# Get user stats
curl "http://localhost:8001/api/v1/users/1/stats"
```

## Frontend Setup & Testing

### 1. Install Frontend Dependencies

```bash
cd /Users/karen.mogridge/VSCodeProjects/NationalParkTracker/frontend
npm install
```

### 2. Start the Development Server

```bash
npm run dev
```

The application will be available at: `http://localhost:5173`

### 3. Test the Application

#### Authentication Flow
1. Open `http://localhost:5173`
2. You should see the login/signup screen
3. **Create Account**: 
   - Enter a name (e.g., "Jane Smith")
   - Enter an email (e.g., "jane@example.com")
   - Click "Sign Up"
4. **Login**: 
   - Enter the same email
   - Click "Login"
5. You'll be redirected to the dashboard

#### Dashboard
- ✅ Should display welcome message with your name
- ✅ Should show park passport stats (parks visited, states, miles, nights)
- ✅ Should display recent visits, hikes, and sightings (empty initially)

#### Park Directory
1. Click "Park Directory" in the sidebar
2. ✅ Should load all parks from the database
3. Filter by region using the region buttons
4. Click "Log Visit" on any park
5. ✅ Modal should appear to log the visit
6. Fill out the form and click "Save Visit"
7. ✅ Modal should close and visit should be recorded

#### My Hikes
1. Click "My Hikes" in the sidebar
2. ✅ Should show "No hikes logged yet" initially
3. Click "+ Log Hike"
4. ✅ Modal should appear
5. **Note**: You may need to add trails first to the parks before logging hikes. Use the API to add trails:

```bash
curl -X POST "http://localhost:8001/api/v1/parks/1/trails" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Half Dome Trail",
    "difficulty": "Hard",
    "distance_miles": 16.5,
    "elevation_gain_ft": 4800,
    "description": "Iconic trail in Yosemite",
    "best_season": "Summer"
  }'
```

6. Then return to the app and log a hike

#### Logout
1. Click the "Logout" button in the sidebar
2. ✅ Should return to login screen
3. Your session is persisted in localStorage
4. Refresh the page and you should still be logged in

## Complete Testing Checklist

### Backend ✅
- [ ] Server starts without errors
- [ ] Database initializes
- [ ] Swagger UI is accessible
- [ ] Can create users via API
- [ ] Parks are seeded correctly
- [ ] Can list parks
- [ ] Can get user by email

### Frontend ✅
- [ ] App loads without errors
- [ ] Can view authentication page
- [ ] Can create a new account
- [ ] User data persists after refresh
- [ ] Can login with existing email
- [ ] Can navigate between pages
- [ ] Can view dashboard stats
- [ ] Can load park directory
- [ ] Can log a park visit
- [ ] Can view hikes page
- [ ] Can log a hike
- [ ] Can logout
- [ ] Logged out state is persistent

### Integration ✅
- [ ] Frontend communicates with backend
- [ ] Data flows correctly from API to UI
- [ ] Form submissions update database
- [ ] Error handling works properly
- [ ] Loading states display correctly

## Troubleshooting

### Issue: Backend won't start
```
Error: Address already in use
```
**Solution**: Change the port in the startup command
```bash
python -m uvicorn app.main:app --reload --port 8002
```
Then update the API_BASE_URL in `frontend/src/utils/api.js`

### Issue: Frontend can't connect to backend
```
Error: Network Error or CORS error
```
**Solution**: 
1. Make sure backend is running on port 8001
2. Check that `API_BASE_URL` in `frontend/src/utils/api.js` matches your backend URL
3. Ensure CORS is enabled in the backend (it should be by default)

### Issue: Database errors when creating users
**Solution**: 
1. Delete `npt.db` file
2. Restart the backend server - it will recreate the database

### Issue: Trails are not showing when logging hikes
**Solution**: You need to add trails to parks first. Add trails via API:
```bash
# Get a park ID first
curl "http://localhost:8001/api/v1/parks" | jq

# Add a trail to a park (replace {park_id} with actual ID)
curl -X POST "http://localhost:8001/api/v1/parks/{park_id}/trails" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Trail Name",
    "difficulty": "Moderate",
    "distance_miles": 10.0,
    "elevation_gain_ft": 1500,
    "description": "Great trail",
    "best_season": "Summer"
  }'
```

## API Endpoints Quick Reference

### Users
- `POST /api/v1/users` - Create user
- `GET /api/v1/users/{user_id}` - Get user by ID
- `GET /api/v1/users/email/{email}` - Get user by email
- `GET /api/v1/users/{user_id}/stats` - Get user stats
- `GET /api/v1/users/{user_id}/passport` - Get park passport

### Parks
- `GET /api/v1/parks` - List parks
- `GET /api/v1/parks/{park_id}` - Get park details

### Visits
- `POST /api/v1/users/{user_id}/visits` - Log a park visit
- `GET /api/v1/users/{user_id}/visits` - Get user visits

### Trails & Hikes
- `POST /api/v1/parks/{park_id}/trails` - Add trail to park
- `POST /api/v1/users/{user_id}/hikes` - Log a hike
- `GET /api/v1/users/{user_id}/hikes` - Get user hikes

### Camping
- `POST /api/v1/parks/{park_id}/campsites` - Add campsite
- `POST /api/v1/users/{user_id}/camping` - Log camping trip

### Wildlife
- `POST /api/v1/users/{user_id}/sightings` - Log wildlife sighting
- `GET /api/v1/users/{user_id}/sightings` - Get sightings

## Next Steps

### Features to Add
1. **Photo uploads** - Gallery for visits and hikes
2. **Fitness tracker integration** - Garmin, Strava, Apple Health
3. **Social sharing** - Share achievements with friends
4. **Leaderboards** - Global rankings
5. **Achievements** - Badges and milestones
6. **Monthly challenges** - Time-limited goals

### Performance Optimization
1. Add pagination to list endpoints
2. Implement caching for park data
3. Optimize database queries
4. Add image compression for photos

### Production Deployment
1. Set up PostgreSQL database
2. Deploy backend to cloud (Heroku, AWS, DigitalOcean)
3. Build and deploy frontend (Vercel, Netlify)
4. Set up CI/CD pipeline
5. Add error tracking (Sentry)
6. Add analytics

## Support

For issues or questions, check:
1. Browser console for frontend errors (F12)
2. Backend logs for server errors
3. Network tab to see API requests
4. Database at `npt.db` to verify data is being stored
