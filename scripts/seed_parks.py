"""Seed the database with US National Parks data."""
import json
import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add parent directory to path to import app modules
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.models import Base, Park, Trail, Badge, Campsite
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
    
    # Seed trails for parks
    trails_data = {
        "Yellowstone": [
            {"name": "Old Faithful Geyser", "difficulty": "Easy", "distance_miles": 1.4, "elevation_gain_ft": 200, "description": "Walk to the iconic Old Faithful geyser that erupts approximately every 90 minutes.", "best_season": "Summer"},
            {"name": "Grand Prismatic Spring", "difficulty": "Easy", "distance_miles": 1.0, "elevation_gain_ft": 50, "description": "View the rainbow-colored Grand Prismatic Spring, the largest hot spring in the US.", "best_season": "Summer"},
            {"name": "Lamar Valley Loop", "difficulty": "Moderate", "distance_miles": 6.5, "elevation_gain_ft": 800, "description": "Scenic loop through prime wildlife viewing area. Excellent for spotting bison, elk, and wolves.", "best_season": "Summer"},
            {"name": "Artist Point", "difficulty": "Easy", "distance_miles": 1.5, "elevation_gain_ft": 300, "description": "Short walk to stunning overlook of the Grand Canyon of the Yellowstone.", "best_season": "Summer"},
            {"name": "Biscuit Basin Loop", "difficulty": "Easy", "distance_miles": 2.4, "elevation_gain_ft": 100, "description": "Boardwalk loop through hot springs and geysers with scenic views.", "best_season": "Summer"},
            {"name": "Norris Geyser Basin", "difficulty": "Easy", "distance_miles": 2.3, "elevation_gain_ft": 100, "description": "Explore the world's most dynamic geyser basin with multiple viewing options.", "best_season": "Summer"},
            {"name": "Fountain Paint Pot", "difficulty": "Easy", "distance_miles": 0.8, "elevation_gain_ft": 80, "description": "Loop trail featuring colorful hot springs, mud pots, and geysers.", "best_season": "Summer"},
            {"name": "Tower Fall", "difficulty": "Moderate", "distance_miles": 3.0, "elevation_gain_ft": 400, "description": "Hike to scenic waterfall with views of Tower Creek canyon.", "best_season": "Summer"},
            {"name": "Dunanda Falls", "difficulty": "Moderate", "distance_miles": 4.0, "elevation_gain_ft": 500, "description": "Beautiful waterfall hike through lodgepole pine forest.", "best_season": "Summer"},
            {"name": "Shiras Peak", "difficulty": "Hard", "distance_miles": 8.0, "elevation_gain_ft": 2000, "description": "Challenging mountain hike with panoramic park views from the summit.", "best_season": "Summer"},
        ],
        "Grand Canyon": [
            {"name": "Bright Angel Trail", "difficulty": "Hard", "distance_miles": 12.0, "elevation_gain_ft": 4380, "description": "Classic trail descending into the Grand Canyon with stunning views at every turn.", "best_season": "Spring"},
            {"name": "South Rim Trail", "difficulty": "Easy", "distance_miles": 13.0, "elevation_gain_ft": 300, "description": "Accessible paved and unpaved sections with spectacular canyon views along the rim.", "best_season": "Fall"},
            {"name": "Kaibab/Rim to Rim", "difficulty": "Hard", "distance_miles": 21.0, "elevation_gain_ft": 5200, "description": "Multi-day backpacking adventure crossing the canyon rim to rim.", "best_season": "Spring"},
            {"name": "Rim Trail - East", "difficulty": "Easy", "distance_miles": 6.0, "elevation_gain_ft": 200, "description": "Scenic rim walk with spectacular canyon vistas and historical viewpoints.", "best_season": "Fall"},
            {"name": "Hermits Rest Trail", "difficulty": "Easy", "distance_miles": 2.6, "elevation_gain_ft": 300, "description": "Scenic trail along the rim to historic Hermits Rest with canyon views.", "best_season": "Fall"},
            {"name": "Hopi Point", "difficulty": "Easy", "distance_miles": 1.5, "elevation_gain_ft": 100, "description": "Short walk to one of the highest and best panorama points on the rim.", "best_season": "Fall"},
            {"name": "Plateau Point Trail", "difficulty": "Hard", "distance_miles": 12.4, "elevation_gain_ft": 3060, "description": "Descend to a scenic plateau overlooking the Colorado River.", "best_season": "Spring"},
            {"name": "Uncle Jim Trail", "difficulty": "Moderate", "distance_miles": 5.0, "elevation_gain_ft": 800, "description": "North Rim trail with views of Roaring Springs Canyon.", "best_season": "Summer"},
            {"name": "Cape Royal Trail", "difficulty": "Easy", "distance_miles": 3.0, "elevation_gain_ft": 200, "description": "North Rim trail ending at a scenic overlook with 360-degree views.", "best_season": "Summer"},
            {"name": "South Kaibab Trail", "difficulty": "Hard", "distance_miles": 6.0, "elevation_gain_ft": 3000, "description": "Steep, exposed descent with incredible canyon views and minimal shade.", "best_season": "Spring"},
        ],
        "Yosemite": [
            {"name": "Half Dome", "difficulty": "Hard", "distance_miles": 14.0, "elevation_gain_ft": 4800, "description": "Challenging trek to Yosemite's iconic Half Dome with cables for the final ascent.", "best_season": "Summer"},
            {"name": "Mist Trail to Vernal Fall", "difficulty": "Moderate", "distance_miles": 5.5, "elevation_gain_ft": 1900, "description": "Dramatic waterfall hike with mist spray from the 317-foot Vernal Fall.", "best_season": "Summer"},
            {"name": "Valley Loop Trail", "difficulty": "Easy", "distance_miles": 7.2, "elevation_gain_ft": 200, "description": "Easy walk with views of major Yosemite Valley attractions including El Capitan and waterfalls.", "best_season": "Summer"},
            {"name": "Mirror Lake Loop", "difficulty": "Easy", "distance_miles": 5.0, "elevation_gain_ft": 200, "description": "Scenic loop around Mirror Lake with reflections of Half Dome and surrounding cliffs.", "best_season": "Spring"},
            {"name": "Sentinel Dome", "difficulty": "Moderate", "distance_miles": 2.2, "elevation_gain_ft": 400, "description": "Short but steep hike to panoramic views of Yosemite Valley and High Country.", "best_season": "Summer"},
            {"name": "Four Mile Trail", "difficulty": "Hard", "distance_miles": 4.8, "elevation_gain_ft": 3200, "description": "Steep climb with switchbacks and spectacular valley views.", "best_season": "Spring"},
            {"name": "Nevada Fall via Mist Trail", "difficulty": "Hard", "distance_miles": 7.0, "elevation_gain_ft": 2600, "description": "Challenging waterfall hike combining Mist Trail with scenic Nevada Fall viewpoint.", "best_season": "Summer"},
            {"name": "Glacier Point Road", "difficulty": "Easy", "distance_miles": 2.0, "elevation_gain_ft": 100, "description": "Scenic drive and walk with panoramic Yosemite views from Glacier Point.", "best_season": "Summer"},
            {"name": "Mariposa Grove", "difficulty": "Easy", "distance_miles": 6.0, "elevation_gain_ft": 500, "description": "Walk among ancient giant sequoias in this stunning grove south of the valley.", "best_season": "Summer"},
            {"name": "Panorama Trail", "difficulty": "Hard", "distance_miles": 8.5, "elevation_gain_ft": 3200, "description": "Spectacular descent from Glacier Point with view of three waterfalls.", "best_season": "Summer"},
        ],
        "Zion": [
            {"name": "Angels Landing", "difficulty": "Hard", "distance_miles": 5.4, "elevation_gain_ft": 1500, "description": "Thrilling hike with chains securing the final ridge walk with panoramic views.", "best_season": "Fall"},
            {"name": "The Narrows", "difficulty": "Moderate", "distance_miles": 10.0, "elevation_gain_ft": 500, "description": "Spectacular canyon hike through the Virgin River with 1000-foot sandstone walls.", "best_season": "Summer"},
            {"name": "Emerald Pools Trail", "difficulty": "Easy", "distance_miles": 2.5, "elevation_gain_ft": 300, "description": "Short walk to scenic pools with views of hanging gardens and waterfalls.", "best_season": "Spring"},
            {"name": "Riverside Walk", "difficulty": "Easy", "distance_miles": 2.0, "elevation_gain_ft": 100, "description": "Paved trail along the Virgin River ending at trailhead for The Narrows.", "best_season": "Spring"},
            {"name": "Lower Emerald Pool", "difficulty": "Easy", "distance_miles": 1.2, "elevation_gain_ft": 100, "description": "Short easy walk to lower emerald pool with waterfall views.", "best_season": "Spring"},
            {"name": "Court of the Patriarchs", "difficulty": "Easy", "distance_miles": 2.0, "elevation_gain_ft": 100, "description": "Scenic trail with views of three massive sandstone peaks.", "best_season": "Spring"},
            {"name": "The Watchman Trail", "difficulty": "Moderate", "distance_miles": 3.3, "elevation_gain_ft": 590, "description": "Popular sunset hike with panoramic views of Zion Canyon.", "best_season": "Fall"},
            {"name": "Observation Point", "difficulty": "Hard", "distance_miles": 8.0, "elevation_gain_ft": 2100, "description": "Strenuous hike to stunning viewpoint overlooking Zion Canyon and The Narrows.", "best_season": "Spring"},
            {"name": "Cable Mountain", "difficulty": "Hard", "distance_miles": 10.0, "elevation_gain_ft": 2650, "description": "Challenging trail to high plateau with expansive views of the park.", "best_season": "Fall"},
            {"name": "The Subway", "difficulty": "Hard", "distance_miles": 9.0, "elevation_gain_ft": 1800, "description": "Technical slot canyon hike with creek crossings and rappelling.", "best_season": "Spring"},
        ],
    }
    
    for park_name, park_trails in trails_data.items():
        park = db.query(Park).filter(Park.name == park_name).first()
        if park:
            for trail_data in park_trails:
                existing_trail = db.query(Trail).filter(
                    Trail.park_id == park.id,
                    Trail.name == trail_data['name']
                ).first()
                if not existing_trail:
                    trail = Trail(park_id=park.id, **trail_data)
                    db.add(trail)
    
    db.commit()
    print(f"✅ Seeded trails for parks")
    
    # Seed campsites for parks
    campsites_data = {
        "Yellowstone": [
            {"name": "Madison Campground", "elevation": 6800, "has_water": True, "has_toilets": True, "max_occupancy": 8, "description": "Scenic campground along the Madison River with good wildlife viewing opportunities."},
            {"name": "Bridge Bay Campground", "elevation": 7800, "has_water": True, "has_toilets": True, "max_occupancy": 6, "description": "Located near Yellowstone Lake with marina and fishing access."},
            {"name": "Grant Village Campground", "elevation": 7800, "has_water": True, "has_toilets": True, "max_occupancy": 6, "description": "Modern campground on the south shore of Yellowstone Lake."},
            {"name": "Old Faithful Campground", "elevation": 7403, "has_water": True, "has_toilets": True, "max_occupancy": 5, "description": "Popular campground near Old Faithful geyser with visitor facilities."},
            {"name": "Mammoth Hot Springs Campground", "elevation": 6240, "has_water": True, "has_toilets": True, "max_occupancy": 6, "description": "Year-round campground at the gateway to the park's northern section."},
        ],
        "Grand Canyon": [
            {"name": "Mather Campground", "elevation": 6800, "has_water": True, "has_toilets": True, "max_occupancy": 6, "description": "Large developed campground on the South Rim with full amenities."},
            {"name": "Desert View Campground", "elevation": 7000, "has_water": False, "has_toilets": True, "max_occupancy": 6, "description": "Smaller campground on the eastern South Rim with scenic desert views."},
            {"name": "North Rim Campground", "elevation": 8200, "has_water": True, "has_toilets": True, "max_occupancy": 6, "description": "The only campground on the North Rim, seasonal operation."},
            {"name": "Ten-X Campground", "elevation": 6400, "has_water": False, "has_toilets": True, "max_occupancy": 6, "description": "Smaller BLM campground near the park with basic amenities."},
            {"name": "Tusayan Camper Village", "elevation": 6500, "has_water": True, "has_toilets": True, "max_occupancy": 8, "description": "Private RV and tent campground just outside the park."},
        ],
        "Yosemite": [
            {"name": "Valley Loop Campground", "elevation": 4000, "has_water": True, "has_toilets": True, "max_occupancy": 6, "description": "Popular campground with multiple sites throughout Yosemite Valley."},
            {"name": "Tuolumne Meadows Campground", "elevation": 8600, "has_water": True, "has_toilets": True, "max_occupancy": 6, "description": "High country campground with access to alpine hiking and backpacking."},
            {"name": "Wawona Campground", "elevation": 4400, "has_water": True, "has_toilets": True, "max_occupancy": 6, "description": "Campground south of Yosemite Valley near the Mariposa Grove."},
            {"name": "Hodgdon Meadow Campground", "elevation": 4900, "has_water": True, "has_toilets": True, "max_occupancy": 6, "description": "Gateway campground near Hetch Hetchy with moderate elevation."},
            {"name": "Half Dome Village", "elevation": 4000, "has_water": True, "has_toilets": True, "max_occupancy": 4, "description": "Historic campground in Yosemite Valley with shower and laundry facilities."},
        ],
        "Zion": [
            {"name": "Watchman Campground", "elevation": 4000, "has_water": True, "has_toilets": True, "max_occupancy": 6, "description": "Popular campground at the south entrance of Zion Canyon with ranger programs."},
            {"name": "South Campground", "elevation": 4000, "has_water": True, "has_toilets": True, "max_occupancy": 6, "description": "Smaller campground near the visitor center with scenic canyon views."},
            {"name": "Lava Point Campground", "elevation": 7890, "has_water": False, "has_toilets": True, "max_occupancy": 6, "description": "Remote high-elevation campground with minimal facilities and stunning views."},
            {"name": "Driftwood Campground", "elevation": 3600, "has_water": True, "has_toilets": True, "max_occupancy": 6, "description": "Private RV and tent campground west of Zion near Springdale."},
            {"name": "East Zion Resorts", "elevation": 4300, "has_water": True, "has_toilets": True, "max_occupancy": 8, "description": "Campground near the east entrance with access to scenic byways."},
        ],
    }
    
    for park_name, park_campsites in campsites_data.items():
        park = db.query(Park).filter(Park.name == park_name).first()
        if park:
            for campsite_data in park_campsites:
                existing_campsite = db.query(Campsite).filter(
                    Campsite.park_id == park.id,
                    Campsite.name == campsite_data['name']
                ).first()
                if not existing_campsite:
                    campsite = Campsite(park_id=park.id, **campsite_data)
                    db.add(campsite)
    
    db.commit()
    print(f"✅ Seeded campsites for parks")
    
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
