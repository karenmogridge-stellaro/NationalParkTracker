from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List

class UserBase(BaseModel):
    name: str
    email: str

class UserCreate(UserBase):
    pass

class UserOut(UserBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    bio: Optional[str] = None
    profile_pic_url: Optional[str] = None
    is_public: bool
    total_points: int
    created_at: datetime

class ParkBase(BaseModel):
    name: str
    state: str
    region: str
    established: str
    area_sq_miles: float
    description: str
    latitude: float
    longitude: float
    website: Optional[str] = None

class ParkCreate(ParkBase):
    pass

class ParkOut(ParkBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime

class VisitCreate(BaseModel):
    park_id: int
    visit_date: datetime
    duration_days: int
    rating: int
    highlights: str
    notes: Optional[str] = None
    visited: bool = True

class VisitOut(VisitCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    photos_count: int
    tagged_users_count: int = 0
    park: Optional["ParkOut"] = None
    created_at: datetime

class TrailBase(BaseModel):
    park_id: int
    name: str
    difficulty: str
    distance_miles: float
    elevation_gain_ft: int
    description: str
    best_season: str

class TrailCreate(TrailBase):
    pass

class TrailOut(TrailBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime

class TrailHikeCreate(BaseModel):
    trail_id: Optional[int] = None
    hike_date: datetime
    duration_minutes: int
    distance_miles: Optional[float] = None
    elevation_gain: Optional[int] = None
    calories: Optional[int] = None
    avg_pace: Optional[str] = None
    notes: Optional[str] = None
    difficulty_experienced: Optional[str] = None
    fitness_tracker_source: Optional[str] = None

class TrailHikeOut(TrailHikeCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    created_at: datetime

class CampsiteBase(BaseModel):
    park_id: int
    name: str
    elevation: int
    has_water: bool
    has_toilets: bool
    max_occupancy: int
    description: str
    booking_opens: Optional[datetime] = None

class CampsiteCreate(CampsiteBase):
    pass

class CampsiteOut(CampsiteBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime

class WishlistBase(BaseModel):
    campsite_id: int
    notification_hours_before: int = 1

class WishlistCreate(WishlistBase):
    pass

class WishlistOut(WishlistBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    campsite: CampsiteOut
    created_at: datetime

class CampingTripCreate(BaseModel):
    campsite_id: int
    visit_date: datetime
    duration_nights: int
    group_size: int
    weather: str
    rating: int
    notes: str

class CampingTripOut(CampingTripCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    created_at: datetime

class SightingCreate(BaseModel):
    park_id: int
    wildlife: str
    sighting_date: datetime
    location: str
    notes: str
    photo_url: Optional[str] = None

class SightingOut(SightingCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    created_at: datetime

class ParkPassportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    total_parks_visited: int
    total_states: int
    total_miles_hiked: float
    total_nights_camped: int
    updated_at: datetime

class UserStats(BaseModel):
    user: UserOut
    passport: ParkPassportOut
    visited_parks: List[ParkOut]
    wishlist_parks: List[ParkOut]
    recent_visits: List[VisitOut]
    recent_hikes: List[TrailHikeOut]
    recent_sightings: List[SightingOut]

# ============ Gamification Schemas ============

class BadgeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: str
    icon_url: str
    criteria: str
    created_at: datetime

class UserAchievementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    badge_id: int
    earned_date: datetime

class ChallengeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    description: str
    challenge_type: str
    target_value: int
    start_date: datetime
    end_date: datetime
    reward_points: int
    icon_url: Optional[str] = None
    created_at: datetime

class UserChallengeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    challenge_id: int
    progress: int
    completed: bool
    completed_date: Optional[datetime] = None
    points_earned: int

class StreakOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    streak_type: str
    current_count: int
    best_count: int
    last_activity_date: datetime
    start_date: datetime

class FitnessTrackerAuthOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    tracker_type: str
    connected: bool
    last_sync: Optional[datetime] = None
    created_at: datetime

class UserProfilePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    bio: Optional[str] = None
    profile_pic_url: Optional[str] = None
    total_points: int
    visited_parks: int
    total_miles_hiked: float
    badges: List[BadgeOut]

class LeaderboardEntry(BaseModel):
    user_id: int
    user_name: str
    profile_pic_url: Optional[str] = None
    parks_visited: int
    miles_hiked: float
    total_points: int
    rank: int
# Garmin Integration
class GarminAuthOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    garmin_user_id: Optional[str]
    connected: bool
    last_sync: Optional[datetime] = None
    created_at: datetime

class GarminActivityImport(BaseModel):
    activity_id: str
    activity_name: str
    activity_date: str
    duration_minutes: int
    distance_miles: Optional[float]
    elevation_gain: Optional[int]
    calories: Optional[int]
    avg_pace: Optional[str]

class GarminImportStats(BaseModel):
    total_activities: int
    imported_hikes: int
    skipped_activities: int
    total_distance: float
    total_elevation: int
# ============ Social Features Schemas ============

class FriendshipCreate(BaseModel):
    friend_email: str

class FriendshipOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    friend_id: int
    status: str
    created_at: datetime
    accepted_at: Optional[datetime] = None

class UserSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: str
    bio: Optional[str] = None
    profile_pic_url: Optional[str] = None

class HikeTagCreate(BaseModel):
    tagged_user_id: int

class HikeTagOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    hike_id: int
    tagged_user_id: int
    created_at: datetime

class CampingTagCreate(BaseModel):
    tagged_user_id: int

class CampingTagOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    camping_trip_id: int
    tagged_user_id: int
    created_at: datetime

class VisitTagCreate(BaseModel):
    tagged_user_id: int

class VisitTagOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    visit_id: int
    tagged_user_id: int
    created_at: datetime

class UserPreferencesOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    favorite_parks: str  # JSON string
    notification_days_before: int
    created_at: datetime
    updated_at: datetime