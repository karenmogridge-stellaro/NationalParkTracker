"""Seed the database with US National Park campsites from campsites_data.json."""
import json
import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add parent directory to path to import app modules
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.models import Base, Park, Campsite
from config import DATABASE_URL

def seed_campsites():
    """Load campsites data from JSON and insert into database."""
    engine = create_engine(DATABASE_URL)
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    # Load campsites data
    campsites_file = Path(__file__).parent / "campsites_data.json"
    with open(campsites_file, 'r') as f:
        campsites_data = json.load(f)

    # Insert campsites
    for site in campsites_data:
        # Find the park by name
        park = db.query(Park).filter(Park.name == site['park']).first()
        if not park:
            print(f"⚠️ Park '{site['park']}' not found for campsite '{site['name']}'")
            continue
        # Check if campsite already exists
        existing = db.query(Campsite).filter(Campsite.name == site['name'], Campsite.park_id == park.id).first()
        if not existing:
            new_site = Campsite(
                name=site['name'],
                park_id=park.id,
                elevation=site.get('elevation', 0),
                has_water=site.get('has_water', False),
                has_toilets=site.get('has_toilets', False),
                max_occupancy=site.get('max_occupancy', 6),
                description=site.get('description', '')
            )
            db.add(new_site)
    db.commit()
    print(f"✅ Seeded {len(campsites_data)} campsites")

if __name__ == "__main__":
    seed_campsites()
