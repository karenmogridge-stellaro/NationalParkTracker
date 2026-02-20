"""Seed the database with US National Parks data."""
import json
import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add parent directory to path to import app modules
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.models import Base, Park, Badge
from config import DATABASE_URL

def seed_parks():
    """Load parks data from JSON and insert into database."""
    engine = create_engine(DATABASE_URL)
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    # Load parks data
    parks_file = Path(__file__).parent / "parks_data.json"
    with open(parks_file, 'r') as f:
        parks_data = json.load(f)
    
    # Insert parks
    for park_data in parks_data:
        # Check if park already exists
        existing = db.query(Park).filter(Park.name == park_data['name']).first()
        if not existing:
            park = Park(**park_data)
            db.add(park)
    
    db.commit()
    print(f"✅ Seeded {len(parks_data)} parks")
    
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
        existing = db.query(Badge).filter(Badge.name == badge_data['name']).first()
        if not existing:
            badge = Badge(**badge_data)
            db.add(badge)
    
    db.commit()
    print(f"✅ Seeded {len(badges_data)} badges")
    db.close()
    print("✅ Database seeding complete!")

if __name__ == "__main__":
    seed_parks()
