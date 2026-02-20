# National Park Tracker

Track your national park adventures with gamification, fitness tracker integration, and interactive leaderboards!

## 🎮 Features

### Core Features
- 🏞️ **Park Tracking** – Log visits to 63+ US National Parks
- 🗻 **Trail Logging** – Record hikes with elevation, distance, and notes
- ⛺ **Camping Trips** – Track campsite experiences and weather
- 🦌 **Wildlife Sightings** – Document animals and birds spotted
- 📸 **Photo Gallery** – Add photos to your visits and achievements

### Gamification 🏆
- **Points System** – Earn points for visits, hikes, photos, and notes
- **8 Achievement Badges** – Unlock badges by reaching milestones
  - Park Explorer (5 parks)
  - State Master (10 states)
  - Elevation Conqueror (50,000 ft)
  - Marathon Hiker (100 miles)
  - Social Butterfly (10 shares)
  - Photographer (50 photos)
  - Camper's Spirit (10 nights)
  - Wildlife Watcher (20 sightings)
- **Streaks** – Build consecutive day/visit streaks
- **Monthly Challenges** – Time-limited goals with rewards
- **Leaderboards** – Global rankings by parks, miles, or points

### Fitness Integration 💪
- **Garmin Connect** – Auto-sync activities and biometrics
- **Strava** – Import cycling and running activities
- **Apple Health** – Connect iPhone health data
- **Automatic Tracking** – Fitness metrics pull into your hikes

### Social Features 📱
- **Public Profiles** – Share your achievements
- **Shareable Links** – QR codes to show friends
- **Social Media Export** – Share achievement images to Instagram, Twitter
- **Stats Dashboard** – Beautiful passport and achievement display

## 🛠️ Tech Stack

### Backend
- **FastAPI** – Modern async Python web framework
- **SQLAlchemy 2.0** – ORM and database layer
- **Pydantic v2** – Data validation
- **SQLite** – Default database (upgradeable to PostgreSQL)

### Frontend (Coming Soon)
- **React Native** – Cross-platform iOS/Android
- **Expo** – Faster development and deployment
- **React Navigation** – Tab and stack navigation
- **Redux** – State management
- **React Query** – Server state management

### Data
- 63+ US National Parks with coordinates
- ~200+ popular trails with difficulty ratings
- Automatic sync with fitness trackers

## 🚀 Getting Started

### Backend Setup

```bash
cd NationalParkTracker
pip install -r requirements.txt
PYTHONPATH=. python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

API docs: http://localhost:8001/docs

### API Endpoints

**Users**
- `POST /api/v1/users` – Create account
- `GET /api/v1/users/{id}` – Get profile
- `PUT /api/v1/users/{id}/profile` – Update profile

**Parks**
- `GET /api/v1/parks` – List all parks (filterable)
- `GET /api/v1/parks/{id}` – Get park details
- `POST /api/v1/parks` – Add custom parks

**Visits**
- `POST /api/v1/users/{id}/visits` – Log park visit
- `GET /api/v1/users/{id}/visits` – Get visit history

**Trails & Hikes**
- `GET /api/v1/parks/{id}/trails` – Get park trails
- `POST /api/v1/users/{id}/hikes` – Log hike
- `GET /api/v1/users/{id}/hikes` – Hike history

**Gamification**
- `GET /api/v1/users/{id}/achievements` – Get badges & streaks
- `GET /api/v1/challenges` – Active monthly challenges
- `GET /api/v1/users/{id}/challenges` – User challenge progress
- `GET /api/v1/leaderboard` – Global leaderboard

**Fitness Trackers**
- `POST /api/v1/users/{id}/fitness-auth/{tracker}` – Connect tracker
- `GET /api/v1/users/{id}/fitness-trackers` – Connected trackers
- `POST /api/v1/users/{id}/sync-fitness/{tracker}` – Manual sync

**Profiles**
- `GET /api/v1/users/{id}/public-profile` – Shareable profile
- `POST /api/v1/users/{id}/profile` – Update profile

## 📊 Database Models

**Core Models**
- User – Profile, points, public/private setting
- Park – 63 US National Parks with coordinates
- Visit – Park visits with notes and ratings
- Trail – Park trails with difficulty levels
- TrailHike – User's hike logs with fitness data

**Gamification Models**
- Badge – Achievement badges
- UserAchievement – Badges earned by user
- Challenge – Monthly challenges
- UserChallenge – User progress on challenges
- Streak – Consecutive action tracking

**Fitness Integration**
- FitnessTrackerAuth – Garmin/Strava/Apple credentials
- SyncLog – Sync history and status

## 🧪 Testing

```bash
pytest -v
```

All 7 tests passing ✅

## 🐳 Docker

```bash
docker build -t park-tracker .
docker run -p 8001:8001 park-tracker
```

## 📱 Mobile App (Phase 2)

React Native app coming soon with:
- Offline-first functionality
- GPS trail tracking
- Photo uploads
- Push notifications for challenges
- Native fitness integrations

## 🎯 Roadmap

- [x] Backend API with 30+ endpoints
- [x] Gamification system (badges, challenges, streaks)
- [x] Fitness tracker integration
- [x] Leaderboards & public profiles
- [x] 63 US parks database
- [ ] React Native mobile app
- [ ] Offline support
- [ ] Trail mapping with GPX
- [ ] Photo organization
- [ ] Friend system
- [ ] Advanced analytics

## 📞 Support

For issues or feature requests, open a GitHub issue.

## 📄 License

MIT
