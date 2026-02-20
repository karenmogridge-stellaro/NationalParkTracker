from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db, SessionLocal
from app.routes import router
from app import models
import json
from pathlib import Path

app = FastAPI(
    title="National Park Tracker",
    description="Track your national park adventures, hikes, camping trips, and wildlife sightings",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
init_db()

@app.on_event("startup")
async def startup_event():
    """Seed database with parks and badges on first startup."""
    db = SessionLocal()
    
    # Check if parks already exist
    parks_count = db.query(models.Park).count()
    badges_count = db.query(models.Badge).count()
    
    if parks_count == 0:
        # Load and seed parks
        parks_file = Path(__file__).parent.parent / "scripts" / "parks_data.json"
        if parks_file.exists():
            with open(parks_file, 'r') as f:
                parks_data = json.load(f)
            for park_data in parks_data:
                existing = db.query(models.Park).filter(models.Park.name == park_data['name']).first()
                if not existing:
                    park = models.Park(**park_data)
                    db.add(park)
            db.commit()
            print(f"✅ Seeded {len(parks_data)} parks")
    
    if badges_count == 0:
        # Seed badges
        badges_data = [
            {
                "name": "Park Explorer",
                "description": "Visit 5 different national parks",
                "icon_url": "🏞️",
                "criteria": "visit_5_parks"
            },
            {
                "name": "State Master",
                "description": "Visit 10+ parks across different states",
                "icon_url": "🗺️",
                "criteria": "visit_10_states"
            },
            {
                "name": "Elevation Conqueror",
                "description": "Hike 50,000+ feet of elevation gain",
                "icon_url": "⛰️",
                "criteria": "hike_50k_elevation"
            },
            {
                "name": "Marathon Hiker",
                "description": "Complete 100+ miles of hiking",
                "icon_url": "🥾",
                "criteria": "hike_100_miles"
            },
            {
                "name": "Social Butterfly",
                "description": "Share your adventures 10+ times",
                "icon_url": "🦋",
                "criteria": "share_10_times"
            },
            {
                "name": "Photographer",
                "description": "Add 50+ photos to your visits",
                "icon_url": "📸",
                "criteria": "upload_50_photos"
            },
            {
                "name": "Camper's Spirit",
                "description": "Camp 10+ nights in national parks",
                "icon_url": "⛺",
                "criteria": "camp_10_nights"
            },
            {
                "name": "Wildlife Watcher",
                "description": "Log 20+ wildlife sightings",
                "icon_url": "🦌",
                "criteria": "sight_20_animals"
            },
        ]
        
        for badge_data in badges_data:
            existing = db.query(models.Badge).filter(models.Badge.name == badge_data['name']).first()
            if not existing:
                badge = models.Badge(**badge_data)
                db.add(badge)
        
        db.commit()
        print(f"✅ Seeded {len(badges_data)} badges")
    
    db.close()

# Include API routes
app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8001, reload=True)
