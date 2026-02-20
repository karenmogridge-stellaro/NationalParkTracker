from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from app.database import get_db
from app import models, schemas
from app.services import AchievementService, FitnessSyncService
from app.recreation_service import RecreationGovService
import asyncio

router = APIRouter(prefix="/api/v1", tags=["parks"])

# ============ Users ============

@router.post("/users", response_model=schemas.UserOut, status_code=201)
async def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """Create a new user."""
    db_user = models.User(**user.model_dump())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.get("/users/{user_id}", response_model=schemas.UserOut)
async def get_user(user_id: int, db: Session = Depends(get_db)):
    """Get user by ID."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.get("/users/email/{email}", response_model=schemas.UserOut)
async def get_user_by_email(email: str, db: Session = Depends(get_db)):
    """Get user by email."""
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# ============ Parks ============

@router.post("/parks", response_model=schemas.ParkOut, status_code=201)
async def create_park(park: schemas.ParkCreate, db: Session = Depends(get_db)):
    """Add a national park."""
    db_park = models.Park(**park.model_dump())
    db.add(db_park)
    db.commit()
    db.refresh(db_park)
    return db_park

@router.get("/parks", response_model=list[schemas.ParkOut])
async def list_parks(region: str = None, state: str = None, db: Session = Depends(get_db)):
    """List parks with optional filters."""
    query = db.query(models.Park)
    if region:
        query = query.filter(models.Park.region == region)
    if state:
        query = query.filter(models.Park.state == state)
    return query.all()

@router.get("/parks/{park_id}", response_model=schemas.ParkOut)
async def get_park(park_id: int, db: Session = Depends(get_db)):
    """Get park by ID."""
    park = db.query(models.Park).filter(models.Park.id == park_id).first()
    if not park:
        raise HTTPException(status_code=404, detail="Park not found")
    return park

# ============ Visits ============

@router.post("/users/{user_id}/visits", response_model=schemas.VisitOut, status_code=201)
async def log_visit(user_id: int, visit: schemas.VisitCreate, db: Session = Depends(get_db)):
    """Log a park visit."""
    db_visit = models.Visit(user_id=user_id, **visit.model_dump())
    db.add(db_visit)
    db.commit()
    db.refresh(db_visit)
    
    # Update passport stats
    update_passport(user_id, db)
    return db_visit

@router.get("/users/{user_id}/visits", response_model=list[schemas.VisitOut])
async def get_visits(user_id: int, visited_only: bool = True, db: Session = Depends(get_db)):
    """Get user's park visits or wishlists."""
    visits = db.query(models.Visit).filter(
        models.Visit.user_id == user_id,
        models.Visit.visited == visited_only
    ).order_by(models.Visit.visit_date.desc()).all()
    return visits

# ============ Trails ============

@router.post("/parks/{park_id}/trails", response_model=schemas.TrailOut, status_code=201)
async def add_trail(park_id: int, trail: schemas.TrailCreate, db: Session = Depends(get_db)):
    """Add a trail to a park."""
    db_trail = models.Trail(park_id=park_id, **{k: v for k, v in trail.model_dump().items() if k != 'park_id'})
    db.add(db_trail)
    db.commit()
    db.refresh(db_trail)
    return db_trail

@router.get("/parks/{park_id}/trails", response_model=list[schemas.TrailOut])
async def get_trails(park_id: int, db: Session = Depends(get_db)):
    """Get trails in a park."""
    trails = db.query(models.Trail).filter(models.Trail.park_id == park_id).all()
    return trails

# ============ Trail Hikes ============

@router.post("/users/{user_id}/hikes", response_model=schemas.TrailHikeOut, status_code=201)
async def log_hike(user_id: int, hike: schemas.TrailHikeCreate, db: Session = Depends(get_db)):
    """Log a trail hike."""
    db_hike = models.TrailHike(user_id=user_id, **hike.model_dump())
    db.add(db_hike)
    db.commit()
    db.refresh(db_hike)
    
    # Update passport
    update_passport(user_id, db)
    return db_hike

@router.get("/users/{user_id}/hikes", response_model=list[schemas.TrailHikeOut])
async def get_hikes(user_id: int, days: int = 90, db: Session = Depends(get_db)):
    """Get user's recent hikes."""
    cutoff = datetime.utcnow() - timedelta(days=days)
    hikes = db.query(models.TrailHike).filter(
        models.TrailHike.user_id == user_id,
        models.TrailHike.hike_date >= cutoff
    ).order_by(models.TrailHike.hike_date.desc()).all()
    return hikes

# ============ Campsites ============

@router.post("/parks/{park_id}/campsites", response_model=schemas.CampsiteOut, status_code=201)
async def add_campsite(park_id: int, campsite: schemas.CampsiteCreate, db: Session = Depends(get_db)):
    """Add a campsite to a park."""
    db_campsite = models.Campsite(park_id=park_id, **{k: v for k, v in campsite.model_dump().items() if k != 'park_id'})
    db.add(db_campsite)
    db.commit()
    db.refresh(db_campsite)
    return db_campsite

@router.get("/parks/{park_id}/campsites", response_model=list[schemas.CampsiteOut])
async def get_campsites(park_id: int, db: Session = Depends(get_db)):
    """Get campsites in a park."""
    campsites = db.query(models.Campsite).filter(models.Campsite.park_id == park_id).all()
    return campsites

# ============ Camping Trips ============

@router.post("/users/{user_id}/camping", response_model=schemas.CampingTripOut, status_code=201)
async def log_camping_trip(user_id: int, trip: schemas.CampingTripCreate, db: Session = Depends(get_db)):
    """Log a camping trip."""
    db_trip = models.CampingTrip(user_id=user_id, **trip.model_dump())
    db.add(db_trip)
    db.commit()
    db.refresh(db_trip)
    
    # Update passport
    update_passport(user_id, db)
    return db_trip

@router.get("/users/{user_id}/camping", response_model=list[schemas.CampingTripOut])
async def get_camping_trips(user_id: int, db: Session = Depends(get_db)):
    """Get user's camping trips."""
    trips = db.query(models.CampingTrip).filter(
        models.CampingTrip.user_id == user_id
    ).order_by(models.CampingTrip.visit_date.desc()).all()
    return trips

# ============ Wildlife Sightings ============

@router.post("/users/{user_id}/sightings", response_model=schemas.SightingOut, status_code=201)
async def log_sighting(user_id: int, sighting: schemas.SightingCreate, db: Session = Depends(get_db)):
    """Log a wildlife sighting."""
    db_sighting = models.Sighting(user_id=user_id, **sighting.model_dump())
    db.add(db_sighting)
    db.commit()
    db.refresh(db_sighting)
    return db_sighting

@router.get("/users/{user_id}/sightings", response_model=list[schemas.SightingOut])
async def get_sightings(user_id: int, db: Session = Depends(get_db)):
    """Get user's wildlife sightings."""
    sightings = db.query(models.Sighting).filter(
        models.Sighting.user_id == user_id
    ).order_by(models.Sighting.sighting_date.desc()).all()
    return sightings

# ============ Park Passport ============

@router.get("/users/{user_id}/passport", response_model=schemas.ParkPassportOut)
async def get_passport(user_id: int, db: Session = Depends(get_db)):
    """Get user's park passport stats."""
    passport = db.query(models.ParkPassport).filter(
        models.ParkPassport.user_id == user_id
    ).first()
    if not passport:
        # Create passport if doesn't exist
        passport = models.ParkPassport(user_id=user_id)
        db.add(passport)
        db.commit()
        db.refresh(passport)
    return passport

# ============ User Stats ============

@router.get("/users/{user_id}/stats", response_model=schemas.UserStats)
async def get_user_stats(user_id: int, db: Session = Depends(get_db)):
    """Get comprehensive user stats."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    passport = db.query(models.ParkPassport).filter(
        models.ParkPassport.user_id == user_id
    ).first()
    if not passport:
        passport = models.ParkPassport(user_id=user_id)
        db.add(passport)
        db.commit()
        db.refresh(passport)
    
    # Get visited parks
    visited_park_ids = db.query(models.Visit.park_id).filter(
        models.Visit.user_id == user_id,
        models.Visit.visited == True
    ).distinct().all()
    visited_parks = db.query(models.Park).filter(models.Park.id.in_([p[0] for p in visited_park_ids])).all()
    
    # Get wishlist parks
    wishlist_park_ids = db.query(models.Visit.park_id).filter(
        models.Visit.user_id == user_id,
        models.Visit.visited == False
    ).distinct().all()
    wishlist_parks = db.query(models.Park).filter(models.Park.id.in_([p[0] for p in wishlist_park_ids])).all()
    
    recent_visits = db.query(models.Visit).filter(models.Visit.user_id == user_id).order_by(models.Visit.visit_date.desc()).limit(5).all()
    recent_hikes = db.query(models.TrailHike).filter(models.TrailHike.user_id == user_id).order_by(models.TrailHike.hike_date.desc()).limit(5).all()
    recent_sightings = db.query(models.Sighting).filter(models.Sighting.user_id == user_id).order_by(models.Sighting.sighting_date.desc()).limit(5).all()
    
    return schemas.UserStats(
        user=user,
        passport=passport,
        visited_parks=visited_parks,
        wishlist_parks=wishlist_parks,
        recent_visits=recent_visits,
        recent_hikes=recent_hikes,
        recent_sightings=recent_sightings
    )

@router.get("/health")
async def health():
    """Health check."""
    return {"status": "ok"}

def update_passport(user_id: int, db: Session):
    """Update passport stats based on user's activities."""
    passport = db.query(models.ParkPassport).filter(
        models.ParkPassport.user_id == user_id
    ).first()
    
    if not passport:
        passport = models.ParkPassport(user_id=user_id)
        db.add(passport)
    
    # Count visited parks
    visited_parks = db.query(models.Visit.park_id).filter(
        models.Visit.user_id == user_id,
        models.Visit.visited == True
    ).distinct().count()
    
    # Count states visited
    park_ids = db.query(models.Visit.park_id).filter(models.Visit.user_id == user_id).all()
    states = db.query(models.Park.state).filter(models.Park.id.in_([p[0] for p in park_ids])).distinct().count()
    
    # Sum miles hiked
    miles_hiked = db.query(models.TrailHike).filter(models.TrailHike.user_id == user_id).with_entities(
        func.sum(models.TrailHike.distance_miles)
    ).scalar() or 0
    
    # Sum camping nights
    nights_camped = db.query(models.CampingTrip).filter(models.CampingTrip.user_id == user_id).with_entities(
        func.sum(models.CampingTrip.duration_nights)
    ).scalar() or 0
    
    passport.total_parks_visited = visited_parks
    passport.total_states = states
    passport.total_miles_hiked = miles_hiked
    passport.total_nights_camped = nights_camped
    passport.updated_at = datetime.utcnow()
    
    db.commit()

# ============ Gamification & Achievements ============

@router.get("/users/{user_id}/achievements", response_model=dict)
async def get_achievements(user_id: int, db: Session = Depends(get_db)):
    """Get user's badges, points, and streaks."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    achievements = AchievementService.get_user_achievements(user_id, db)
    badges_out = [schemas.BadgeOut.model_validate(b) for b in achievements["badges"]]
    streaks_out = [schemas.StreakOut.model_validate(s) for s in achievements["streaks"]]
    
    return {
        "total_points": user.total_points,
        "badge_count": achievements["badge_count"],
        "badges": badges_out,
        "streaks": streaks_out
    }

@router.get("/challenges", response_model=list[schemas.ChallengeOut])
async def list_active_challenges(db: Session = Depends(get_db)):
    """Get all active monthly challenges."""
    now = datetime.utcnow()
    challenges = db.query(models.Challenge).filter(
        models.Challenge.start_date <= now,
        models.Challenge.end_date >= now
    ).all()
    return challenges

@router.get("/users/{user_id}/challenges", response_model=list[schemas.UserChallengeOut])
async def get_user_challenges(user_id: int, db: Session = Depends(get_db)):
    """Get user's current challenge progress."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check progress on all active challenges
    AchievementService.check_challenge_progress(user_id, db)
    
    # Check and award badges
    AchievementService.check_and_award_badges(user_id, db)
    
    # Return user challenges
    challenges = db.query(models.UserChallenge).filter(
        models.UserChallenge.user_id == user_id
    ).all()
    return challenges

@router.get("/leaderboard", response_model=list[schemas.LeaderboardEntry])
async def get_leaderboard(sort_by: str = "points", limit: int = 100, db: Session = Depends(get_db)):
    """Get global leaderboard. sort_by: 'points', 'parks', or 'miles'."""
    leaderboard = AchievementService.get_leaderboard(limit=limit, sort_by=sort_by, db=db)
    return [schemas.LeaderboardEntry(**entry) for entry in leaderboard]

# ============ Fitness Tracker Integration ============

@router.post("/users/{user_id}/fitness-auth/{tracker_type}")
async def connect_fitness_tracker(user_id: int, tracker_type: str, access_token: str, 
                                 refresh_token: str = None, expires_in: int = None, 
                                 db: Session = Depends(get_db)):
    """Connect a fitness tracker account (garmin, strava, apple_health)."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    tracker_type = tracker_type.lower()
    if tracker_type not in ["garmin", "strava", "apple_health"]:
        raise HTTPException(status_code=400, detail="Invalid tracker type")
    
    auth = FitnessSyncService.update_auth_token(
        user_id, tracker_type, access_token, refresh_token, expires_in, db
    )
    
    return {
        "tracker_type": auth.tracker_type,
        "connected": auth.connected,
        "last_sync": auth.last_sync
    }

@router.get("/users/{user_id}/fitness-trackers", response_model=list[schemas.FitnessTrackerAuthOut])
async def get_connected_trackers(user_id: int, db: Session = Depends(get_db)):
    """Get all connected fitness trackers for a user."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    trackers = db.query(models.FitnessTrackerAuth).filter(
        models.FitnessTrackerAuth.user_id == user_id
    ).all()
    return trackers

@router.post("/users/{user_id}/fitness-auth/{tracker_type}/disconnect")
async def disconnect_fitness_tracker(user_id: int, tracker_type: str, db: Session = Depends(get_db)):
    """Disconnect a fitness tracker."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    FitnessSyncService.disconnect_tracker(user_id, tracker_type.lower(), db)
    return {"status": "disconnected", "tracker_type": tracker_type}

@router.post("/users/{user_id}/sync-fitness/{tracker_type}")
async def manual_sync_fitness(user_id: int, tracker_type: str, db: Session = Depends(get_db)):
    """Manually trigger sync for a specific tracker (placeholder for actual sync logic)."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    auth = db.query(models.FitnessTrackerAuth).filter(
        models.FitnessTrackerAuth.user_id == user_id,
        models.FitnessTrackerAuth.tracker_type == tracker_type.lower()
    ).first()
    
    if not auth or not auth.connected:
        raise HTTPException(status_code=400, detail="Tracker not connected")
    
    # In real app, would call actual Garmin/Strava/Apple Health API here
    # For now, just update last_sync timestamp
    auth.last_sync = datetime.utcnow()
    db.commit()
    
    FitnessSyncService.log_sync(user_id, tracker_type.lower(), 0, True, db=db)
    
    return {
        "status": "synced",
        "tracker_type": tracker_type,
        "last_sync": auth.last_sync,
        "activities_synced": 0
    }

# ============ User Profiles & Sharing ============

@router.get("/users/{user_id}/public-profile", response_model=schemas.UserProfilePublic)
async def get_public_profile(user_id: int, db: Session = Depends(get_db)):
    """Get public profile (shareable)."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user or not user.is_public:
        raise HTTPException(status_code=404, detail="Profile not found or not public")
    
    # Get visits and achievements
    visited_parks = db.query(models.Visit.park_id).filter(
        models.Visit.user_id == user_id,
        models.Visit.visited == True
    ).distinct().count()
    
    miles_hiked = db.query(models.TrailHike).filter(
        models.TrailHike.user_id == user_id
    ).with_entities(
        func.sum(models.TrailHike.distance_miles)
    ).scalar() or 0
    
    user_achievements = db.query(models.UserAchievement).filter(
        models.UserAchievement.user_id == user_id
    ).all()
    
    badges = db.query(models.Badge).filter(
        models.Badge.id.in_([a.badge_id for a in user_achievements])
    ).all()
    
    badges_out = [schemas.BadgeOut.model_validate(b) for b in badges]
    
    return schemas.UserProfilePublic(
        id=user.id,
        name=user.name,
        bio=user.bio,
        profile_pic_url=user.profile_pic_url,
        total_points=user.total_points,
        visited_parks=visited_parks,
        total_miles_hiked=float(miles_hiked),
        badges=badges_out
    )

@router.put("/users/{user_id}/profile")
async def update_user_profile(user_id: int, name: str = None, bio: str = None, 
                             profile_pic_url: str = None, is_public: bool = None, 
                             db: Session = Depends(get_db)):
    """Update user profile information."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if name:
        user.name = name
    if bio is not None:
        user.bio = bio
    if profile_pic_url:
        user.profile_pic_url = profile_pic_url
    if is_public is not None:
        user.is_public = is_public
    
    db.commit()
    db.refresh(user)
    return schemas.UserOut.model_validate(user)

