# National Park Tracker - Quick Reference Guide

A quick reference for developers continuing to build the National Park Tracker.

## 🚀 Quick Start Commands

### Start Everything
```bash
# Terminal 1: Start Backend
cd /Users/karen.mogridge/VSCodeProjects/NationalParkTracker
python -m uvicorn app.main:app --reload --port 8001

# Terminal 2: Start Frontend
cd /Users/karen.mogridge/VSCodeProjects/NationalParkTracker/frontend
npm run dev
```

Then visit: http://localhost:5173

---

## 📁 Project Structure

```
NationalParkTracker/
├── app/                          # Backend (FastAPI)
│   ├── main.py                  # App entry point + startup
│   ├── routes.py               # API endpoints
│   ├── models.py               # Database models
│   ├── schemas.py              # Pydantic schemas
│   ├── database.py             # DB setup & sessions
│   ├── services.py             # Business logic
│   └── garmin_service.py       # Fitness integration
├── frontend/                     # Frontend (React)
│   ├── src/
│   │   ├── App.jsx             # Main app component
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx   # Stats & overview
│   │   │   ├── ParkDirectory.jsx # Browse parks
│   │   │   ├── MyHikes.jsx     # Hikes log
│   │   │   └── Auth.jsx        # Login/signup
│   │   ├── utils/
│   │   │   ├── api.js          # API client
│   │   │   └── UserContext.jsx # Auth context
│   │   ├── index.css           # Tailwind & custom styles
│   │   └── main.jsx            # Entry point
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── scripts/
│   ├── parks_data.json         # Parks seed data
│   └── seed_parks.py
├── tests/
│   └── test_main.py
├── TESTING_GUIDE.md            # How to test
├── DEVELOPMENT_SUMMARY.md      # What was done
└── README.md

```

---

## 🔌 API Endpoints Reference

### Authentication
```
POST   /api/v1/users                    Create user
GET    /api/v1/users/{user_id}         Get user
GET    /api/v1/users/email/{email}     Get user by email
```

### Parks
```
GET    /api/v1/parks                   List parks
GET    /api/v1/parks/{park_id}         Get park details
POST   /api/v1/parks/{park_id}/trails  Add trail
GET    /api/v1/parks/{park_id}/trails  Get trails
POST   /api/v1/parks/{park_id}/campsites Add campsite
GET    /api/v1/parks/{park_id}/campsites List campsites
```

### User Activities
```
POST   /api/v1/users/{user_id}/visits         Log visit
GET    /api/v1/users/{user_id}/visits         Get visits
POST   /api/v1/users/{user_id}/hikes          Log hike
GET    /api/v1/users/{user_id}/hikes          Get hikes
POST   /api/v1/users/{user_id}/camping        Log camping
GET    /api/v1/users/{user_id}/camping        Get camping trips
POST   /api/v1/users/{user_id}/sightings      Log sighting
GET    /api/v1/users/{user_id}/sightings      Get sightings
```

### Stats
```
GET    /api/v1/users/{user_id}/stats          Get all stats
GET    /api/v1/users/{user_id}/passport       Get passport stats
GET    /api/v1/users/{user_id}/achievements   Get achievements
```

---

## 🎯 Common Development Tasks

### Add a New Feature to Frontend

1. **Create Component** (if needed)
```jsx
// src/pages/NewPage.jsx
import { useEffect, useState } from 'react'
import { useUser } from '../utils/UserContext'
import { parkAPI } from '../utils/api'

export default function NewPage() {
  const { user } = useUser()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.id) loadData()
  }, [user?.id])

  const loadData = async () => {
    try {
      const response = await parkAPI.someEndpoint(user.id)
      setData(response.data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      {/* Your content here */}
    </div>
  )
}
```

2. **Add API Method** (in `frontend/src/utils/api.js`)
```javascript
// Under the parkAPI object
someEndpoint: (userId) => api.get(`/users/${userId}/something`),
```

3. **Add Route** (in `App.jsx`)
```jsx
<Route path="/new-page" element={<NewPage />} />
```

4. **Add Navigation** (in `App.jsx`)
Update the `navItems` array

---

### Add a Backend Endpoint

1. **Create Database Model** (in `models.py`)
```python
class YourModel(Base):
    __tablename__ = "your_models"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    # Add fields
```

2. **Create Pydantic Schema** (in `schemas.py`)
```python
class YourModelCreate(BaseModel):
    # Input fields
    pass

class YourModelOut(BaseModel):
    # Output fields
    model_config = ConfigDict(from_attributes=True)
```

3. **Add Route Handler** (in `routes.py`)
```python
@router.post("/your-endpoint", response_model=schemas.YourModelOut, status_code=201)
async def create_item(user_id: int, item: schemas.YourModelCreate, db: Session = Depends(get_db)):
    """Description of endpoint."""
    db_item = models.YourModel(user_id=user_id, **item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item
```

---

## 🎨 Styling Guide

### Tailwind CSS Classes Used
```
Colors:    bg-green-*, text-green-*, border-green-*
           bg-blue-*, bg-orange-*, bg-purple-*
Spacing:   p-4, px-6, py-2, gap-4, mb-4
Layout:    flex, grid, grid-cols-1, gap-4
Cards:     .card (predefined in index.css)
Buttons:   .btn, .btn-primary
Forms:     .input-field (predefined in index.css)
```

### Add Custom CSS Class
```css
/* In frontend/src/index.css */
.my-class {
  @apply flex items-center justify-between p-4 bg-white rounded-lg;
}
```

---

## 🧪 Testing Common Scenarios

### Test Login Flow
```bash
# Create user
curl -X POST http://localhost:8001/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com"}'

# Get user by email
curl http://localhost:8001/api/v1/users/email/test@example.com
```

### Test Park Visit
```bash
curl -X POST http://localhost:8001/api/v1/users/1/visits \
  -H "Content-Type: application/json" \
  -d '{
    "park_id": 1,
    "visit_date": "2024-02-20",
    "duration_days": 3,
    "rating": 5,
    "highlights": "Amazing views",
    "visited": true
  }'
```

### Test Hike Logging
```bash
# First add a trail to a park
curl -X POST http://localhost:8001/api/v1/parks/1/trails \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Example Trail",
    "difficulty":"Moderate",
    "distance_miles":10,
    "elevation_gain_ft":1500,
    "description":"Nice hike",
    "best_season":"Summer"
  }'

# Then log a hike
curl -X POST http://localhost:8001/api/v1/users/1/hikes \
  -H "Content-Type: application/json" \
  -d '{
    "trail_id": 1,
    "hike_date": "2024-02-20",
    "duration_minutes": 120,
    "distance_miles": 10.5
  }'
```

---

## 🐛 Debugging Tips

### Frontend Debugging
- Open DevTools: F12
- Check Console tab for errors
- Network tab to see API calls
- React DevTools browser extension
- localStorage: Opens Chrome DevTools Storage

### Backend Debugging
- Terminal shows server logs
- Use `print()` for basic debugging
- Check http://localhost:8001/docs for API testing
- Database directly: `sqlite3 npt.db`

### Check User Session
```javascript
// In browser console
localStorage.getItem('parktracker_user')
```

---

## 📦 Installing Dependencies

### Frontend
```bash
cd frontend
npm install                    # Install all deps
npm install package-name       # Add new package
npm update                     # Update all packages
```

### Backend
```bash
pip install -r requirements.txt
pip install new-package        # Add new package
pip freeze > requirements.txt   # Update requirements.txt
```

---

## 🚨 Common Issues & Fixes

### Port Already in Use
```bash
# Find what's using port 8001
lsof -i :8001

# Use a different port
python -m uvicorn app.main:app --reload --port 8002
```

### CORS Error
- Backend has CORS enabled by default
- Check that frontend is calling correct backend URL in `api.js`

### Database Locked
```bash
# Delete database and restart
rm /Users/karen.mogridge/VSCodeProjects/NationalParkTracker/npt.db
# Then restart backend
```

### Frontend Won't Load
- Clear browser cache (Ctrl+Shift+Delete)
- Kill npm process and restart
- Check console for specific errors

---

## 📚 Documentation Links

- **FastAPI**: https://fastapi.tiangolo.com/
- **React**: https://react.dev/
- **React Router**: https://reactrouter.com/
- **Tailwind CSS**: https://tailwindcss.com/
- **Vite**: https://vitejs.dev/
- **SQLAlchemy**: https://docs.sqlalchemy.org/

---

## 💡 Pro Tips

1. **Use API Docs**: http://localhost:8001/docs for testing endpoints
2. **Reload Frontend**: Ctrl+R or Cmd+R to hard refresh
3. **Check Data**: Use `SELECT * FROM table_name` in SQLite
4. **Save Early**: Use Git frequently for version control
5. **Test Often**: Manually test after each feature
6. **Read Errors**: Console errors usually tell you exactly what's wrong

---

## 🎓 Learning Path for New Features

1. **Simple Features**: Add database fields, new endpoints
2. **Medium Features**: Add new pages, forms, modals
3. **Complex Features**: Integration with external APIs, advanced UI
4. **Advanced Features**: Authentication overhaul, caching, optimization

---

**Last Updated**: February 20, 2026

For detailed information, see:
- `TESTING_GUIDE.md` - Complete testing instructions
- `DEVELOPMENT_SUMMARY.md` - What was completed
- `README.md` - Project overview
