"""Seed sample campsites into the database."""
import sys
sys.path.insert(0, '/Users/karen.mogridge/VSCodeProjects/NationalParkTracker')

from app.database import SessionLocal
from app import models
from datetime import datetime, timedelta

def seed_campsites():
    db = SessionLocal()
    
    # Sample campsite data for first 4 parks
    campsites_data = [
        # Park 1 campsites
        {
            "park_id": 1,
            "name": "Mammoth Hot Springs",
            "elevation": 6239,
            "has_water": True,
            "has_toilets": True,
            "max_occupancy": 285,
            "description": "Located at North Yellowstone. Features geothermal hot springs views, water, electrical hookups, and dump station.",
            "booking_opens": datetime.now() + timedelta(days=30)
        },
        {
            "park_id": 1,
            "name": "Bridge Bay",
            "elevation": 7800,
            "has_water": True,
            "has_toilets": True,
            "max_occupancy": 430,
            "description": "Central Yellowstone location. Offers boat launch access, fishing opportunities, and water services.",
            "booking_opens": datetime.now() + timedelta(days=25)
        },
        # Park 2 campsites
        {
            "park_id": 2,
            "name": "North Rim",
            "elevation": 8148,
            "has_water": True,
            "has_toilets": True,
            "max_occupancy": 83,
            "description": "North Rim Grand Canyon. Water available, ranger programs, and scenic views.",
            "booking_opens": datetime.now() + timedelta(days=20)
        },
        {
            "park_id": 2,
            "name": "South Rim",
            "elevation": 7000,
            "has_water": True,
            "has_toilets": True,
            "max_occupancy": 318,
            "description": "South Rim Grand Canyon. Water, electrical sites, showers, and general store access.",
            "booking_opens": datetime.now() + timedelta(days=15)
        },
        # Park 3 campsites
        {
            "park_id": 3,
            "name": "Valley View",
            "elevation": 4000,
            "has_water": True,
            "has_toilets": True,
            "max_occupancy": 119,
            "description": "Yosemite Valley location. Water, electrical hookups, and flush toilets available.",
            "booking_opens": datetime.now() + timedelta(days=60)
        },
        {
            "park_id": 3,
            "name": "Wawona",
            "elevation": 5800,
            "has_water": True,
            "has_toilets": True,
            "max_occupancy": 93,
            "description": "South Yosemite. Water services, dump station, and ranger programs.",
            "booking_opens": datetime.now() + timedelta(days=45)
        },
        # Park 4 campsites
        {
            "park_id": 4,
            "name": "The Grotto",
            "elevation": 4000,
            "has_water": True,
            "has_toilets": True,
            "max_occupancy": 127,
            "description": "Zion Canyon location. Water, flush toilets, and ranger programs available.",
            "booking_opens": datetime.now() + timedelta(days=35)
        },
        {
            "park_id": 4,
            "name": "South Campground",
            "elevation": 4400,
            "has_water": True,
            "has_toilets": True,
            "max_occupancy": 141,
            "description": "South Zion. Water, electrical sites, and dump station.",
            "booking_opens": datetime.now() + timedelta(days=30)
        },
    ]
    
    try:
        for data in campsites_data:
            # Check if campsite already exists
            existing = db.query(models.Campsite).filter_by(
                park_id=data["park_id"],
                name=data["name"]
            ).first()
            
            if not existing:
                campsite = models.Campsite(**data)
                db.add(campsite)
                print(f"Added campsite: {data['name']} (Park {data['park_id']})")
            else:
                print(f"Campsite already exists: {data['name']}")
        
        db.commit()
        print("✓ Campsites seeded successfully!")
    except Exception as e:
        db.rollback()
        print(f"✗ Error seeding campsites: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_campsites()
