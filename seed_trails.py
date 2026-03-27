"""Clear hikes and seed sample trails into the database."""
import sys
sys.path.insert(0, '/Users/karen.mogridge/VSCodeProjects/NationalParkTracker')

from app.database import SessionLocal
from app import models

def seed_trails():
    db = SessionLocal()
    
    # Clear all hikes first
    try:
        hikes_count = db.query(models.TrailHike).delete()
        db.commit()
        print(f"✓ Cleared {hikes_count} hikes from database")
    except Exception as e:
        db.rollback()
        print(f"✗ Error clearing hikes: {e}")
        db.close()
        return
    
    # Sample trail data for first 4 parks
    trails_data = [
        # Park 1 - Yellowstone
        {
            "park_id": 1,
            "name": "Artist Point Trail",
            "difficulty": "Moderate",
            "distance_miles": 3.6,
            "elevation_gain_ft": 400,
            "description": "Scenic viewpoint overlooking the Grand Canyon of the Yellowstone with artist-inspired views.",
            "best_season": "Summer"
        },
        {
            "park_id": 1,
            "name": "Beehive Lake Trail",
            "difficulty": "Moderate",
            "distance_miles": 3.0,
            "elevation_gain_ft": 900,
            "description": "Alpine lake hike with mountain views and potential cascade sightings.",
            "best_season": "Summer"
        },
        {
            "park_id": 1,
            "name": "Fairy Falls Trail",
            "difficulty": "Easy",
            "distance_miles": 3.2,
            "elevation_gain_ft": 100,
            "description": "Scenic waterfall hike through meadows and forests.",
            "best_season": "Summer"
        },
        {
            "park_id": 1,
            "name": "Grand Prismatic Spring Trail",
            "difficulty": "Easy",
            "distance_miles": 1.4,
            "elevation_gain_ft": 100,
            "description": "Loop around the largest hot spring in the US with stunning views of the colorful thermal feature.",
            "best_season": "Summer"
        },
        {
            "park_id": 1,
            "name": "Lamar Valley Trail",
            "difficulty": "Moderate",
            "distance_miles": 5.2,
            "elevation_gain_ft": 300,
            "description": "Trek through Lamar Valley, known for wildlife sightings including bison, elk, and grizzly bears.",
            "best_season": "Summer"
        },
        {
            "park_id": 1,
            "name": "Old Faithful Geyser Loop",
            "difficulty": "Easy",
            "distance_miles": 1.3,
            "elevation_gain_ft": 50,
            "description": "Short walk to observe Old Faithful geyser eruptions.",
            "best_season": "Summer"
        },
        # Park 2 - Grand Canyon
        {
            "park_id": 2,
            "name": "Bright Angel Trail",
            "difficulty": "Hard",
            "distance_miles": 9.3,
            "elevation_gain_ft": 4000,
            "description": "Steep descent into the canyon with amazing geological formations and historic rest houses.",
            "best_season": "Spring"
        },
        {
            "park_id": 2,
            "name": "Cape Royal Trail",
            "difficulty": "Easy",
            "distance_miles": 3.0,
            "elevation_gain_ft": 200,
            "description": "Scenic rim trail with panoramic canyon views and access to Cape Royal overlook.",
            "best_season": "Fall"
        },
        {
            "park_id": 2,
            "name": "Hermits Rest Trail",
            "difficulty": "Moderate",
            "distance_miles": 1.7,
            "elevation_gain_ft": 300,
            "description": "Historic trail to Mary Colter's 1914 Hermits Rest building with stunning views.",
            "best_season": "Fall"
        },
        {
            "park_id": 2,
            "name": "North Kaibab Trail",
            "difficulty": "Hard",
            "distance_miles": 14.0,
            "elevation_gain_ft": 5500,
            "description": "Challenging trail descending to the Colorado River with stunning views.",
            "best_season": "Summer"
        },
        {
            "park_id": 2,
            "name": "Rim Trail",
            "difficulty": "Easy",
            "distance_miles": 13.0,
            "elevation_gain_ft": 200,
            "description": "Scenic rim walk with multiple overlooks and breathtaking canyon views.",
            "best_season": "Fall"
        },
        {
            "park_id": 2,
            "name": "Widforss Trail",
            "difficulty": "Moderate",
            "distance_miles": 9.8,
            "elevation_gain_ft": 500,
            "description": "Remote North Rim trail with ponderosa pines and excellent canyon vistas.",
            "best_season": "Summer"
        },
        # Park 3 - Yosemite
        {
            "park_id": 3,
            "name": "Clouds Rest",
            "difficulty": "Hard",
            "distance_miles": 14.5,
            "elevation_gain_ft": 2226,
            "description": "High alpine peak with 360-degree views of Yosemite's peaks and valleys.",
            "best_season": "Summer"
        },
        {
            "park_id": 3,
            "name": "Half Dome Summit",
            "difficulty": "Hard",
            "distance_miles": 16.0,
            "elevation_gain_ft": 4800,
            "description": "Epic day hike to the summit of Half Dome with cable sections near the top.",
            "best_season": "Summer"
        },
        {
            "park_id": 3,
            "name": "Lower Yosemite Fall",
            "difficulty": "Easy",
            "distance_miles": 1.0,
            "elevation_gain_ft": 100,
            "description": "Short, accessible trail to the base of Yosemite's famous waterfall.",
            "best_season": "Spring"
        },
        {
            "park_id": 3,
            "name": "Mist Trail",
            "difficulty": "Moderate",
            "distance_miles": 5.5,
            "elevation_gain_ft": 1000,
            "description": "Stunning trail to Vernal Fall with mist spray and granite cliffs.",
            "best_season": "Summer"
        },
        {
            "park_id": 3,
            "name": "Mirror Lake Loop",
            "difficulty": "Easy",
            "distance_miles": 5.0,
            "elevation_gain_ft": 100,
            "description": "Peaceful walk around Mirror Lake with reflections of Half Dome and surrounding peaks.",
            "best_season": "Summer"
        },
        {
            "park_id": 3,
            "name": "Valley View Trail",
            "difficulty": "Easy",
            "distance_miles": 2.0,
            "elevation_gain_ft": 150,
            "description": "Scenic river viewpoint trail with classic Yosemite Valley vistas.",
            "best_season": "Fall"
        },
        # Park 4 - Zion
        {
            "park_id": 4,
            "name": "Angels Landing",
            "difficulty": "Hard",
            "distance_miles": 5.4,
            "elevation_gain_ft": 1488,
            "description": "Classic Zion hike with chain assistance and incredible canyon views.",
            "best_season": "Fall"
        },
        {
            "park_id": 4,
            "name": "Emerald Pools Trail",
            "difficulty": "Moderate",
            "distance_miles": 3.0,
            "elevation_gain_ft": 350,
            "description": "Trail to emerald-colored pools with waterfalls and hanging gardens.",
            "best_season": "Spring"
        },
        {
            "park_id": 4,
            "name": "Observation Point",
            "difficulty": "Hard",
            "distance_miles": 8.0,
            "elevation_gain_ft": 2600,
            "description": "Steep climb to high overlook with panoramic Zion Canyon views.",
            "best_season": "Fall"
        },
        {
            "park_id": 4,
            "name": "The Narrows",
            "difficulty": "Moderate",
            "distance_miles": 9.4,
            "elevation_gain_ft": 600,
            "description": "Hike through a narrow canyon with towering red walls and a river.",
            "best_season": "Spring"
        },
        {
            "park_id": 4,
            "name": "The Subway",
            "difficulty": "Hard",
            "distance_miles": 9.0,
            "elevation_gain_ft": 1800,
            "description": "Technical slot canyon hike with rappelling and swimming sections.",
            "best_season": "Fall"
        },
        {
            "park_id": 4,
            "name": "Watchman Trail",
            "difficulty": "Moderate",
            "distance_miles": 3.3,
            "elevation_gain_ft": 368,
            "description": "Popular sunset trail with panoramic views of Zion Canyon.",
            "best_season": "Fall"
        },
    ]
    
    try:
        for data in trails_data:
            trail = models.Trail(**data)
            db.add(trail)
            print(f"Added trail: {data['name']} (Park {data['park_id']})")
        
        db.commit()
        print(f"\n✓ Successfully seeded {len(trails_data)} trails!")
    except Exception as e:
        db.rollback()
        print(f"✗ Error seeding trails: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_trails()
