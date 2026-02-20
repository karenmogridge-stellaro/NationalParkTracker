"""Business logic for achievements, gamification, and fitness tracking."""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
from app import models

class AchievementService:
    """Service for managing badges, points, and achievements."""
    
    @staticmethod
    def award_points(user_id: int, action_type: str, value: int, db: Session):
        """Award points to a user for an action."""
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if user:
            user.total_points += value
            db.commit()
            return user.total_points

    @staticmethod
    def check_and_award_badges(user_id: int, db: Session) -> list:
        """Check user's progress and award badges if criteria are met."""
        awarded_badges = []
        user = db.query(models.User).filter(models.User.id == user_id).first()
        
        if not user:
            return awarded_badges
        
        # Get all existing badges for this user
        existing_badges = db.query(models.UserAchievement).filter(
            models.UserAchievement.user_id == user_id
        ).all()
        existing_badge_ids = set(ba.badge_id for ba in existing_badges)
        
        # Check each badge criteria
        badges = db.query(models.Badge).all()
        for badge in badges:
            if badge.id in existing_badge_ids:
                continue  # Already earned
            
            if badge.criteria == "visit_5_parks":
                visits = db.query(models.Visit).filter(
                    models.Visit.user_id == user_id,
                    models.Visit.visited == True
                ).distinct(models.Visit.park_id).count()
                if visits >= 5:
                    AchievementService._award_badge(user_id, badge.id, db)
                    awarded_badges.append(badge.name)
            
            elif badge.criteria == "visit_10_states":
                states = db.query(models.Park.state).join(
                    models.Visit, models.Visit.park_id == models.Park.id
                ).filter(models.Visit.user_id == user_id).distinct().count()
                if states >= 10:
                    AchievementService._award_badge(user_id, badge.id, db)
                    awarded_badges.append(badge.name)
            
            elif badge.criteria == "hike_100_miles":
                total_miles = db.query(models.TrailHike).filter(
                    models.TrailHike.user_id == user_id
                ).with_entities(
                    func.sum(models.TrailHike.distance_miles)
                ).scalar() or 0
                if total_miles >= 100:
                    AchievementService._award_badge(user_id, badge.id, db)
                    awarded_badges.append(badge.name)
            
            elif badge.criteria == "hike_50k_elevation":
                total_elevation = db.query(models.TrailHike).filter(
                    models.TrailHike.user_id == user_id
                ).with_entities(
                    func.sum(models.TrailHike.elevation_gain)
                ).scalar() or 0
                if total_elevation >= 50000:
                    AchievementService._award_badge(user_id, badge.id, db)
                    awarded_badges.append(badge.name)
            
            elif badge.criteria == "camp_10_nights":
                total_nights = db.query(models.CampingTrip).filter(
                    models.CampingTrip.user_id == user_id
                ).with_entities(
                    func.sum(models.CampingTrip.duration_nights)
                ).scalar() or 0
                if total_nights >= 10:
                    AchievementService._award_badge(user_id, badge.id, db)
                    awarded_badges.append(badge.name)
            
            elif badge.criteria == "sight_20_animals":
                sightings = db.query(models.Sighting).filter(
                    models.Sighting.user_id == user_id
                ).count()
                if sightings >= 20:
                    AchievementService._award_badge(user_id, badge.id, db)
                    awarded_badges.append(badge.name)
        
        return awarded_badges
    
    @staticmethod
    def _award_badge(user_id: int, badge_id: int, db: Session):
        """Internal method to award a badge to a user."""
        achievement = models.UserAchievement(
            user_id=user_id,
            badge_id=badge_id,
            earned_date=datetime.utcnow()
        )
        db.add(achievement)
        db.commit()
        # Award bonus points
        AchievementService.award_points(user_id, "badge", 250, db)

    @staticmethod
    def update_streaks(user_id: int, activity_type: str, db: Session):
        """Update user streaks. activity_type: 'hiking_days' or 'park_visits'."""
        streak = db.query(models.Streak).filter(
            models.Streak.user_id == user_id,
            models.Streak.streak_type == activity_type
        ).first()
        
        if not streak:
            streak = models.Streak(
                user_id=user_id,
                streak_type=activity_type,
                current_count=1,
                best_count=1,
                last_activity_date=datetime.utcnow(),
                start_date=datetime.utcnow()
            )
            db.add(streak)
        else:
            # Check if activity happened today
            today = datetime.utcnow().date()
            last_activity = streak.last_activity_date.date()
            
            if last_activity == today:
                # Already logged today
                pass
            elif (today - last_activity).days == 1:
                # Consecutive day - increase streak
                streak.current_count += 1
                if streak.current_count > streak.best_count:
                    streak.best_count = streak.current_count
            else:
                # Streak broken - reset
                streak.current_count = 1
                streak.start_date = datetime.utcnow()
            
            streak.last_activity_date = datetime.utcnow()
        
        db.commit()
        return streak

    @staticmethod
    def get_user_achievements(user_id: int, db: Session) -> dict:
        """Get all achievements for a user."""
        achievements = db.query(models.UserAchievement).filter(
            models.UserAchievement.user_id == user_id
        ).all()
        
        badges = db.query(models.Badge).filter(
            models.Badge.id.in_([a.badge_id for a in achievements])
        ).all()
        
        streaks = db.query(models.Streak).filter(
            models.Streak.user_id == user_id
        ).all()
        
        return {
            "badges": badges,
            "badge_count": len(achievements),
            "streaks": streaks
        }

    @staticmethod
    def check_challenge_progress(user_id: int, db: Session) -> list:
        """Check user's progress on active challenges and update completion status."""
        completed_challenges = []
        
        # Get active challenges
        now = datetime.utcnow()
        active_challenges = db.query(models.Challenge).filter(
            models.Challenge.start_date <= now,
            models.Challenge.end_date >= now
        ).all()
        
        for challenge in active_challenges:
            user_challenge = db.query(models.UserChallenge).filter(
                models.UserChallenge.user_id == user_id,
                models.UserChallenge.challenge_id == challenge.id
            ).first()
            
            if not user_challenge:
                user_challenge = models.UserChallenge(
                    user_id=user_id,
                    challenge_id=challenge.id,
                    progress=0,
                    completed=False
                )
                db.add(user_challenge)
            
            # Calculate current progress
            if challenge.challenge_type == "visit_parks":
                progress = db.query(models.Visit).filter(
                    models.Visit.user_id == user_id,
                    models.Visit.visited == True,
                    models.Visit.visit_date >= challenge.start_date
                ).distinct(models.Visit.park_id).count()
            
            elif challenge.challenge_type == "hike_miles":
                progress = int(db.query(models.TrailHike).filter(
                    models.TrailHike.user_id == user_id,
                    models.TrailHike.hike_date >= challenge.start_date
                ).with_entities(
                    func.sum(models.TrailHike.distance_miles)
                ).scalar() or 0)
            
            elif challenge.challenge_type == "elevation":
                progress = int(db.query(models.TrailHike).filter(
                    models.TrailHike.user_id == user_id,
                    models.TrailHike.hike_date >= challenge.start_date
                ).with_entities(
                    func.sum(models.TrailHike.elevation_gain)
                ).scalar() or 0)
            
            else:
                progress = 0
            
            user_challenge.progress = progress
            
            # Check if completed
            if progress >= challenge.target_value and not user_challenge.completed:
                user_challenge.completed = True
                user_challenge.completed_date = now
                user_challenge.points_earned = challenge.reward_points
                AchievementService.award_points(user_id, "challenge", challenge.reward_points, db)
                completed_challenges.append(challenge.title)
        
        db.commit()
        return completed_challenges

    @staticmethod
    def get_leaderboard(limit: int = 100, sort_by: str = "points", db: Session = None) -> list:
        """Get leaderboard sorted by specified metric."""
        if not db:
            return []
        
        # Base query to get user aggregated stats
        query = db.query(
            models.User.id,
            models.User.name,
            models.User.profile_pic_url,
            models.User.total_points,
            func.count(
                distinct(models.Visit.park_id)
            ).label("parks_visited"),
            func.coalesce(
                func.sum(models.TrailHike.distance_miles), 0
            ).label("miles_hiked")
        ).outerjoin(
            models.Visit, models.Visit.user_id == models.User.id
        ).outerjoin(
            models.TrailHike, models.TrailHike.user_id == models.User.id
        ).filter(
            models.User.is_public == True
        ).group_by(
            models.User.id
        )
        
        # Sort by specified metric
        if sort_by == "miles":
            query = query.order_by(func.sum(models.TrailHike.distance_miles).desc())
        elif sort_by == "parks":
            query = query.order_by(
                func.count(distinct(models.Visit.park_id)).desc()
            )
        else:  # Default to points
            query = query.order_by(models.User.total_points.desc())
        
        results = query.limit(limit).all()
        
        leaderboard = []
        for rank, result in enumerate(results, 1):
            leaderboard.append({
                "rank": rank,
                "user_id": result.id,
                "user_name": result.name,
                "profile_pic_url": result.profile_pic_url,
                "total_points": result.total_points,
                "parks_visited": result.parks_visited,
                "miles_hiked": float(result.miles_hiked or 0)
            })
        
        return leaderboard


class FitnessSyncService:
    """Service for syncing with fitness trackers (Garmin, Strava, Apple Health)."""
    
    @staticmethod
    def get_or_create_auth(user_id: int, tracker_type: str, db: Session) -> models.FitnessTrackerAuth:
        """Get or create fitness tracker auth record."""
        auth = db.query(models.FitnessTrackerAuth).filter(
            models.FitnessTrackerAuth.user_id == user_id,
            models.FitnessTrackerAuth.tracker_type == tracker_type
        ).first()
        
        if not auth:
            auth = models.FitnessTrackerAuth(
                user_id=user_id,
                tracker_type=tracker_type,
                access_token="",
                connected=False
            )
            db.add(auth)
            db.commit()
        
        return auth
    
    @staticmethod
    def log_sync(user_id: int, tracker_type: str, activities_synced: int, success: bool, 
                 error_message: str = None, db: Session = None):
        """Log a sync attempt."""
        if not db:
            return
        
        sync_log = models.SyncLog(
            user_id=user_id,
            tracker_type=tracker_type,
            activities_synced=activities_synced,
            success=success,
            error_message=error_message,
            sync_date=datetime.utcnow()
        )
        db.add(sync_log)
        db.commit()
    
    @staticmethod
    def update_auth_token(user_id: int, tracker_type: str, access_token: str, 
                         refresh_token: str = None, expires_in: int = None, db: Session = None):
        """Update fitness tracker auth tokens."""
        if not db:
            return
        
        auth = FitnessSyncService.get_or_create_auth(user_id, tracker_type, db)
        auth.access_token = access_token
        auth.refresh_token = refresh_token
        auth.connected = True
        
        if expires_in:
            auth.token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
        
        db.commit()
        return auth
    
    @staticmethod
    def disconnect_tracker(user_id: int, tracker_type: str, db: Session):
        """Disconnect a fitness tracker."""
        auth = db.query(models.FitnessTrackerAuth).filter(
            models.FitnessTrackerAuth.user_id == user_id,
            models.FitnessTrackerAuth.tracker_type == tracker_type
        ).first()
        
        if auth:
            auth.connected = False
            auth.access_token = ""
            auth.refresh_token = None
            db.commit()
