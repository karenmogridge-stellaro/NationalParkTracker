"""Seed the database with US National Park trails from trails_data.json."""
import json
import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add parent directory to path to import app modules
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.models import Base, Park, Trail
from config import DATABASE_URL

def seed_trails():
    """Load trails data from JSON and insert into database."""
    engine = create_engine(DATABASE_URL)
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    # Load trails data
    trails_file = Path(__file__).parent / "trails_data.json"
    with open(trails_file, 'r') as f:
        trails_data = json.load(f)

    # Insert trails
    for trail in trails_data:
        # Find the park by name
        park = db.query(Park).filter(Park.name == trail['park']).first()
        if not park:
            print(f"⚠️ Park '{trail['park']}' not found for trail '{trail['name']}'")
            continue
        # Check if trail already exists
        existing = db.query(Trail).filter(Trail.name == trail['name'], Trail.park_id == park.id).first()
        if not existing:
            new_trail = Trail(
                name=trail['name'],
                park_id=park.id,
                distance_miles=trail.get('length_miles'),
                difficulty=trail.get('difficulty'),
                description=trail.get('description'),
                elevation_gain_ft=trail.get('elevation_gain_ft', 0),
                best_season=trail.get('best_season', 'Summer')
            )
            db.add(new_trail)
    db.commit()
    print(f"✅ Seeded {len(trails_data)} trails")

if __name__ == "__main__":
    seed_trails()
