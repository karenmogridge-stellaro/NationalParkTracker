import { useState, useEffect } from 'react'
import { parkAPI } from '../utils/api'
import { useUser } from '../utils/UserContext'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Trophy, Mountain, Tent, Eye, MapPin, Activity } from 'lucide-react'

export default function Dashboard() {
  const { user } = useUser()
  const [stats, setStats] = useState(null)
  const [passport, setPassport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user?.id) {
      loadStats()
    }
  }, [user?.id])

  const loadStats = async () => {
    setLoading(true)
    setError('')
    try {
      const [statsRes, passportRes] = await Promise.all([
        parkAPI.getUserStats(user.id),
        parkAPI.getPassport(user.id),
      ])
      setStats(statsRes.data)
      setPassport(passportRes.data)
    } catch (error) {
      console.error('Failed to load stats:', error)
      setError('Failed to load your adventure stats. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">🏕️</div>
        <p className="text-gray-600 text-lg">Loading your adventure stats...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button 
          onClick={loadStats}
          className="btn btn-primary"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Welcome, {user?.name}! 🏞️</h1>
        <p className="text-gray-600">Your national park adventure log</p>
      </div>

      {/* Park Passport Stats */}
      {passport && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card 
            icon={<Trophy className="w-6 h-6" />} 
            label="Parks Visited" 
            value={passport.total_parks_visited || 0} 
            color="green" 
          />
          <Card 
            icon={<Mountain className="w-6 h-6" />} 
            label="States Explored" 
            value={passport.total_states || 0} 
            color="blue" 
          />
          <Card 
            icon={<MapPin className="w-6 h-6" />} 
            label="Miles Hiked" 
            value={(passport.total_miles_hiked || 0).toFixed(1)} 
            color="indigo" 
          />
          <Card 
            icon={<Tent className="w-6 h-6" />} 
            label="Camping Nights" 
            value={Math.round(passport.total_nights_camped || 0)} 
            color="orange" 
          />
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Visits */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Park Visits</h2>
            <Trophy className="w-5 h-5 text-green-600" />
          </div>
          {stats?.recent_visits?.length > 0 ? (
            <div className="space-y-3">
              {stats.recent_visits.slice(0, 5).map((visit) => (
                <div key={visit.id} className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-100 hover:border-green-300 transition">
                  <div>
                    <p className="font-medium text-gray-900">Park Visit</p>
                    <p className="text-sm text-gray-600">{visit.duration_days} day{visit.duration_days !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-yellow-500">⭐ {visit.rating || '–'}/5</p>
                    <p className="text-xs text-gray-500">{new Date(visit.visit_date).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No park visits logged yet</p>
            </div>
          )}
        </div>

        {/* Recent Hikes */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Hikes</h2>
            <Activity className="w-5 h-5 text-blue-600" />
          </div>
          {stats?.recent_hikes?.length > 0 ? (
            <div className="space-y-3">
              {stats.recent_hikes.slice(0, 5).map((hike) => (
                <div key={hike.id} className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-100 hover:border-blue-300 transition">
                  <div>
                    <p className="font-medium text-gray-900">Trail Hike</p>
                    <p className="text-sm text-gray-600">
                      {hike.distance_miles ? `${hike.distance_miles.toFixed(1)} mi` : 'Distance unknown'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-700">
                      {Math.round((hike.duration_minutes || 0) / 60)}h
                    </p>
                    <p className="text-xs text-gray-500">{new Date(hike.hike_date).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <Mountain className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No hikes logged yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Wildlife Sightings */}
      {stats?.recent_sightings?.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">🦌 Wildlife Sightings</h2>
            <Eye className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.recent_sightings.slice(0, 6).map((sighting) => (
              <div 
                key={sighting.id} 
                className="p-4 bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg border border-green-200 hover:border-green-400 transition hover:shadow-md"
              >
                <p className="font-semibold text-lg text-gray-900">{sighting.wildlife || 'Unknown Species'}</p>
                <p className="text-xs text-gray-600 mt-1">{new Date(sighting.sighting_date).toLocaleDateString()}</p>
                {sighting.location && (
                  <p className="text-xs text-gray-500 mt-2">📍 {sighting.location}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Card({ icon, label, value, color }) {
  const colors = {
    green: 'bg-green-50 text-green-600 border-green-200',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  }

  return (
    <div className={`card border ${colors[color]} hover:shadow-lg transition`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium opacity-75">{label}</p>
          <p className="text-4xl font-bold mt-2">{value}</p>
        </div>
        <div className="p-3 bg-white rounded-lg opacity-75">{icon}</div>
      </div>
    </div>
  )
}
