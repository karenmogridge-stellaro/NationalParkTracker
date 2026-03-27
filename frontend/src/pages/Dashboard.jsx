import { useState, useEffect } from 'react'
import { parkAPI } from '../utils/api'
import { useUser } from '../utils/UserContext'
import { Trophy, Mountain, Tent, MapPin, Flame, Target, Users, ChevronRight, Star, Zap } from 'lucide-react'
import ProgressRing, { MiniProgressRing } from '../components/ProgressRing'
import { BadgeGrid } from '../components/BadgeCard'
import ParkList from '../components/ParkList'
import ActivityLog from '../components/ActivityLog'

// Region colors for visual distinction
const REGION_COLORS = {
  'Southwest': '#f97316',
  'Pacific': '#3b82f6', 
  'Rockies': '#8b5cf6',
  'Southeast': '#22c55e',
  'Northeast': '#ec4899',
  'Alaska': '#06b6d4',
  'Midwest': '#eab308',
  'Islands': '#14b8a6'
}

export default function Dashboard() {
  const { user } = useUser()
  const [passport, setPassport] = useState(null)
  const [totalParks, setTotalParks] = useState(68)
  const [regionStats, setRegionStats] = useState([])
  const [recommendedParks, setRecommendedParks] = useState([])
  const [achievements, setAchievements] = useState(null)
  const [allBadges, setAllBadges] = useState([])
  const [userChallenges, setUserChallenges] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [allParks, setAllParks] = useState([])
  const [activityLog, setActivityLog] = useState([])

  useEffect(() => {
    if (user?.id) {
      loadDashboardData()
    }
  }, [user?.id])

  const loadDashboardData = async () => {
    setLoading(true)
    setError('')
    try {
      const [
        passportRes,
        parksRes,
        regionRes,
        recommendedRes,
        achievementsRes,
        badgesRes,
        challengesRes,
        leaderboardRes
      ] = await Promise.all([
        parkAPI.getPassport(user.id),
        parkAPI.listParks(),
        parkAPI.getParksByRegion(user.id),
        parkAPI.getRecommendedParks(user.id, 5),
        parkAPI.getAchievements(user.id),
        parkAPI.getAllBadges(),
        parkAPI.getUserChallenges(user.id),
        parkAPI.getLeaderboard('parks', 10)
      ])
      
      setPassport(passportRes.data)
      setTotalParks(parksRes.data?.length || 68)
      setAllParks(parksRes.data || [])
      setRegionStats(regionRes.data || [])
      setRecommendedParks(recommendedRes.data || [])
      setAchievements(achievementsRes.data)
      setAllBadges(badgesRes.data || [])
      setUserChallenges(challengesRes.data || [])
      setLeaderboard(leaderboardRes.data || [])
      // Example: fetch user activity log (replace with real API call if available)
      setActivityLog([
        { icon: '🏞️', text: 'Visited Yellowstone', date: '2026-03-20' },
        { icon: '🥾', text: 'Hiked Mist Trail', date: '2026-03-18' },
        { icon: '⛺', text: 'Camped at Upper Pines', date: '2026-03-15' },
      ])
    } catch (error) {
      console.error('Failed to load dashboard:', error)
      setError('Failed to load dashboard. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🏕️</div>
          <p className="text-gray-600 text-lg">Loading your adventure stats...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={loadDashboardData} className="btn btn-primary">
          Try Again
        </button>
      </div>
    )
  }

  const parksVisited = passport?.total_parks_visited || 0
  const progressPercentage = totalParks > 0 ? Math.round((parksVisited / totalParks) * 100) : 0
  
  // Find user's rank in leaderboard
  const userRank = leaderboard.findIndex(entry => entry.user_id === user?.id) + 1

  return (
    <div className="min-h-screen bg-[#f7faf7] px-4 py-6">
      {/* Hero Section: Main Progress */}
      <div className="w-full max-w-full rounded-2xl bg-green-800 text-white shadow-lg mx-auto p-8 flex flex-col md:flex-row items-center gap-8">
        <div className="flex-shrink-0 flex flex-col items-center justify-center">
          <ProgressRing
            value={parksVisited}
            max={totalParks}
            size={140}
            strokeWidth={14}
            color="#fff"
            bgColor="#256029"
          />
        </div>
        <div className="flex-1 flex flex-col items-center md:items-start">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-2">The Journey Begins! <span className="align-middle">🌱</span></h1>
          <p className="text-lg font-semibold mb-4">You've explored <span className="font-bold">{parksVisited}</span> of {totalParks} national parks</p>
          <div className="flex flex-wrap gap-4 w-full justify-center md:justify-start">
            <StatBox icon={<Mountain className="w-5 h-5" />} value={passport?.total_states || 0} label="States" />
            <StatBox icon={<MapPin className="w-5 h-5" />} value={(passport?.total_miles_hiked || 0).toFixed(0)} label="Miles" />
            <StatBox icon={<Tent className="w-5 h-5" />} value={passport?.total_nights_camped || 0} label="Nights" />
            <StatBox icon={<Trophy className="w-5 h-5" />} value={achievements?.total_points || 0} label="Points" />
          </div>
        </div>
      </div>

      {/* Regional Progress */}
      <div className="bg-white rounded-xl shadow p-6 mt-8">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-green-800">
          <MapPin className="w-5 h-5 text-green-600" />
          Progress by Region
        </h2>
        <div className="flex flex-wrap gap-6 justify-center md:justify-start">
          {regionStats.map((region) => (
            <div key={region.region} className="flex flex-col items-center min-w-[70px]">
              <MiniProgressRing
                value={region.visited}
                max={region.total}
                color={REGION_COLORS[region.region] || '#22c55e'}
                label={region.region}
              />
              <span className="text-xs text-gray-700 mt-1">{region.region}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Three Column Grid: Recommendations, Challenges, Leaderboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {/* Must-Visit Parks */}
        <div className="bg-white rounded-xl shadow p-6 flex flex-col">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2 text-yellow-700">
            <Star className="w-5 h-5 text-yellow-500" />
            Must-Visit Next
          </h2>
          <p className="text-sm text-gray-500 mb-3">Top-rated parks you haven't explored yet</p>
          {recommendedParks.length > 0 ? (
            <div className="flex flex-col gap-2">
              {recommendedParks.map((park, index) => (
                <div key={park.id} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200 hover:border-yellow-400 transition cursor-pointer">
                  <span className="text-lg font-bold text-yellow-600">#{index + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{park.name}</p>
                    <p className="text-xs text-gray-500">{park.state} · {park.region}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
              <p className="text-gray-600">Amazing! You've visited all parks!</p>
            </div>
          )}
        </div>
        {/* Challenges & Badges */}
        <div className="bg-white rounded-xl shadow p-6 flex flex-col">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2 text-green-800">
            <Target className="w-5 h-5 text-purple-600" />
            Challenges & Badges
          </h2>
          {userChallenges.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Active Challenges</h3>
              <div className="flex flex-col gap-2">
                {userChallenges.slice(0, 2).map((uc) => (
                  <ChallengeProgress key={uc.id} challenge={uc} />
                ))}
              </div>
            </div>
          )}
          <BadgeGrid
            allBadges={allBadges}
            earnedBadges={achievements?.badges || []}
            maxDisplay={4}
          />
          {achievements?.streaks?.length > 0 && (
            <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                <span className="font-medium text-gray-800">
                  {achievements.streaks[0].current_count} day streak!
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Best: {achievements.streaks[0].best_count} days
              </p>
            </div>
          )}
        </div>
        {/* Leaderboard */}
        <div className="bg-white rounded-xl shadow p-6 flex flex-col">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2 text-blue-800">
            <Users className="w-5 h-5 text-blue-600" />
            Leaderboard
          </h2>
          <p className="text-sm text-gray-500 mb-3">Top explorers by parks visited</p>
          {leaderboard.length > 0 ? (
            <div className="flex flex-col gap-2">
              {leaderboard.slice(0, 5).map((entry, index) => (
                <div
                  key={entry.user_id}
                  className={`flex items-center gap-3 p-3 rounded-lg transition ${
                    entry.user_id === user?.id
                      ? 'bg-blue-100 border border-blue-300'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <span className={`w-6 font-bold ${
                    index === 0 ? 'text-yellow-500' :
                    index === 1 ? 'text-gray-400' :
                    index === 2 ? 'text-amber-600' :
                    'text-gray-500'
                  }`}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">
                      {entry.name}
                      {entry.user_id === user?.id && <span className="text-blue-600 ml-1">(You)</span>}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-700">{entry.parks_visited}</p>
                    <p className="text-xs text-gray-500">parks</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No leaderboard data yet</p>
            </div>
          )}
          {userRank > 5 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200 text-center">
              <p className="text-sm text-gray-600">
                Your rank: <span className="font-bold text-blue-600">#{userRank}</span>
              </p>
            </div>
          )}
        </div>
      </div>
      {/* Optionally, add more sections below as needed */}
    </div>
  )
}


function StatBox({ icon, value, label }) {
  return (
    <div className="flex flex-col items-center bg-green-900/80 rounded-lg px-6 py-3 min-w-[90px]">
      <div className="mb-1">{icon}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-green-100 font-medium">{label}</div>
    </div>
  )
}

function ChallengeProgress({ challenge }) {
  const progress = challenge.progress || 0
  const target = challenge.challenge?.target_value || 100
  const percentage = Math.min((progress / target) * 100, 100)
  const isComplete = challenge.completed
  
  return (
    <div className={`p-3 rounded-lg border ${isComplete ? 'bg-green-50 border-green-300' : 'bg-purple-50 border-purple-200'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-gray-800 text-sm truncate">
          {challenge.challenge?.title || 'Challenge'}
        </span>
        {isComplete ? (
          <span className="text-green-600 text-xs font-medium">✓ Complete!</span>
        ) : (
          <span className="text-purple-600 text-xs font-medium">{progress}/{target}</span>
        )}
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-green-500' : 'bg-purple-500'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

function getMotivationalMessage(percentage) {
  if (percentage === 0) return "Start Your Adventure! 🚀"
  if (percentage < 10) return "The Journey Begins! 🌱"
  if (percentage < 25) return "You're Getting Started! 🌲"
  if (percentage < 50) return "Halfway Explorer! ⛰️"
  if (percentage < 75) return "Adventure Master! 🏔️"
  if (percentage < 100) return "Almost There! 🌟"
  return "Park Champion! 🏆"
}
