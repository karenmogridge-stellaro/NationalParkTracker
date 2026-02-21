from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    bio = Column(Text, nullable=True)  # User bio for public profile
    profile_pic_url = Column(String, nullable=True)  # User profile picture
    is_public = Column(Boolean, default=True)  # Public or private profile
    total_points = Column(Integer, default=0)  # Gamification points
    created_at = Column(DateTime, default=datetime.utcnow)

class Park(Base):
    __tablename__ = "parks"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    state = Column(String)
    region = Column(String)  # "Southwest", "Pacific", etc.
    established = Column(String)  # Year established
    area_sq_miles = Column(Float)
    description = Column(Text)
    latitude = Column(Float)
    longitude = Column(Float)
    website = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Visit(Base):
    __tablename__ = "visits"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    park_id = Column(Integer, ForeignKey("parks.id"), index=True)
    visit_date = Column(DateTime)
    duration_days = Column(Integer)  # How many days spent
    rating = Column(Integer)  # 1-5 stars
    highlights = Column(Text)  # Key experiences
    notes = Column(Text, nullable=True)  # User notes about the visit
    photos_count = Column(Integer, default=0)
    visited = Column(Boolean, default=True)  # True = visited, False = wishlist
    created_at = Column(DateTime, default=datetime.utcnow)

class Trail(Base):
    __tablename__ = "trails"
    
    id = Column(Integer, primary_key=True, index=True)
    park_id = Column(Integer, ForeignKey("parks.id"), index=True)
    name = Column(String, index=True)
    difficulty = Column(String)  # "Easy", "Moderate", "Hard"
    distance_miles = Column(Float)
    elevation_gain_ft = Column(Integer)
    description = Column(Text)
    best_season = Column(String)  # "Spring", "Summer", "Fall", "Winter"
    created_at = Column(DateTime, default=datetime.utcnow)

class TrailHike(Base):
    __tablename__ = "trail_hikes"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    trail_id = Column(Integer, ForeignKey("trails.id"), index=True)
    hike_date = Column(DateTime)
    duration_minutes = Column(Integer)
    distance_miles = Column(Float, nullable=True)  # Actual distance hiked
    elevation_gain = Column(Integer, nullable=True)
    calories = Column(Integer, nullable=True)  # From fitness tracker
    avg_pace = Column(String, nullable=True)  # e.g., "12.5 min/mi"
    notes = Column(Text, nullable=True)  # User notes about the hike
    difficulty_experienced = Column(String)  # How hard they found it
    fitness_tracker_source = Column(String, nullable=True)  # garmin/strava/apple_health/manual
    created_at = Column(DateTime, default=datetime.utcnow)

class Campsite(Base):
    __tablename__ = "campsites"
    
    id = Column(Integer, primary_key=True, index=True)
    park_id = Column(Integer, ForeignKey("parks.id"), index=True)
    name = Column(String, index=True)
    elevation = Column(Integer)  # Feet
    has_water = Column(Boolean, default=False)
    has_toilets = Column(Boolean, default=False)
    max_occupancy = Column(Integer)
    description = Column(Text)
    booking_opens = Column(DateTime, nullable=True)  # When bookings open (e.g., 5 months ahead)
    created_at = Column(DateTime, default=datetime.utcnow)

class Wishlist(Base):
    __tablename__ = "wishlist"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    campsite_id = Column(Integer, ForeignKey("campsites.id"), index=True)
    notification_hours_before = Column(Integer, default=1)  # Notify X hours before booking opens
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    campsite = relationship("Campsite")

class CampingTrip(Base):
    __tablename__ = "camping_trips"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    campsite_id = Column(Integer, ForeignKey("campsites.id"), index=True)
    visit_date = Column(DateTime)
    duration_nights = Column(Integer)
    group_size = Column(Integer)
    weather = Column(String)  # "Sunny", "Rainy", "Cold", etc.
    rating = Column(Integer)  # 1-5 stars
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class Sighting(Base):
    __tablename__ = "sightings"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    park_id = Column(Integer, ForeignKey("parks.id"), index=True)
    wildlife = Column(String)  # "Bear", "Elk", "Eagle", etc.
    sighting_date = Column(DateTime)
    location = Column(String)  # Where in park
    notes = Column(Text)
    photo_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ParkPassport(Base):
    __tablename__ = "park_passports"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, unique=True)
    total_parks_visited = Column(Integer, default=0)
    total_states = Column(Integer, default=0)
    total_miles_hiked = Column(Float, default=0)
    total_nights_camped = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# ============ Gamification Models ============

class Badge(Base):
    __tablename__ = "badges"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(Text)
    icon_url = Column(String)
    criteria = Column(String)  # e.g., "visit_5_parks", "hike_100_miles"
    created_at = Column(DateTime, default=datetime.utcnow)

class UserAchievement(Base):
    __tablename__ = "user_achievements"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    badge_id = Column(Integer, ForeignKey("badges.id"), index=True)
    earned_date = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

class Challenge(Base):
    __tablename__ = "challenges"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text)
    challenge_type = Column(String)  # "visit_parks", "hike_miles", "elevation", "seasonal"
    target_value = Column(Integer)  # e.g., 3 parks, 100 miles
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    reward_points = Column(Integer)
    icon_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class UserChallenge(Base):
    __tablename__ = "user_challenges"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    challenge_id = Column(Integer, ForeignKey("challenges.id"), index=True)
    progress = Column(Integer, default=0)  # Current progress toward target
    completed = Column(Boolean, default=False)
    completed_date = Column(DateTime, nullable=True)
    points_earned = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

class Streak(Base):
    __tablename__ = "streaks"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    streak_type = Column(String)  # "hiking_days", "park_visits", "consecutive_weeks"
    current_count = Column(Integer, default=0)  # Active streak count
    best_count = Column(Integer, default=0)  # Best all-time count
    last_activity_date = Column(DateTime)  # Last time activity was logged
    start_date = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

class FitnessTrackerAuth(Base):
    __tablename__ = "fitness_tracker_auth"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    tracker_type = Column(String)  # "garmin", "strava", "apple_health"
    access_token = Column(Text)
    refresh_token = Column(Text, nullable=True)
    token_expires_at = Column(DateTime, nullable=True)
    connected = Column(Boolean, default=True)
    last_sync = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class SyncLog(Base):
    __tablename__ = "sync_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    tracker_type = Column(String)
    activities_synced = Column(Integer, default=0)
    success = Column(Boolean, default=True)
    error_message = Column(Text, nullable=True)
    sync_date = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

class GarminAuth(Base):
    __tablename__ = "garmin_auth"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, index=True)
    access_token = Column(Text)  # Encrypted in production
    refresh_token = Column(Text, nullable=True)
    token_expires_at = Column(DateTime)
    garmin_user_id = Column(String, nullable=True)
    connected = Column(Boolean, default=True)
    last_sync = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
