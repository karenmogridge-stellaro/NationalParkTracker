import { useState, useEffect } from 'react'
import { Activity, MapPin, Clock, X, Plus } from 'lucide-react'
import { parkAPI } from '../utils/api'
import { useUser } from '../utils/UserContext'

export default function MyHikes() {
  const { user } = useUser()
  const [hikes, setHikes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [trails, setTrails] = useState([])
  const [parks, setParks] = useState([])
  const [hikeForm, setHikeForm] = useState({
    trail_id: '',
    hike_date: new Date().toISOString().split('T')[0],
    duration_minutes: 120,
    distance_miles: '',
    elevation_gain: '',
    notes: '',
  })

  useEffect(() => {
    if (user?.id) {
      loadHikes()
      loadParksAndTrails()
    }
  }, [user?.id])

  const loadHikes = async () => {
    setLoading(true)
    try {
      const response = await parkAPI.getHikes(user.id, 90)
      setHikes(response.data)
      setError('')
    } catch (err) {
      console.error('Failed to load hikes:', err)
      setError('Failed to load hikes.')
    } finally {
      setLoading(false)
    }
  }

  const loadParksAndTrails = async () => {
    try {
      const parksRes = await parkAPI.listParks()
      setParks(parksRes.data)
      
      // Load trails for each park
      const allTrails = []
      for (const park of parksRes.data) {
        try {
          const trailsRes = await parkAPI.getTrails(park.id)
          allTrails.push(...(trailsRes.data || []))
        } catch (err) {
          // Park may not have trails yet
        }
      }
      setTrails(allTrails)
    } catch (err) {
      console.error('Failed to load parks/trails:', err)
    }
  }

  const openModal = () => {
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setHikeForm({
      trail_id: '',
      hike_date: new Date().toISOString().split('T')[0],
      duration_minutes: 120,
      distance_miles: '',
      elevation_gain: '',
      notes: '',
    })
  }

  const handleHikeChange = (e) => {
    const { name, value } = e.target
    setHikeForm(prev => ({
      ...prev,
      [name]: ['duration_minutes', 'elevation_gain'].includes(name) ? 
        (value ? parseInt(value) : value) : 
        (name === 'distance_miles' ? parseFloat(value) : value)
    }))
  }

  const handleLogHike = async (e) => {
    e.preventDefault()
    if (!hikeForm.trail_id || !user) return

    setSubmitting(true)
    try {
      await parkAPI.logHike(user.id, {
        trail_id: parseInt(hikeForm.trail_id),
        hike_date: hikeForm.hike_date,
        duration_minutes: hikeForm.duration_minutes,
        distance_miles: hikeForm.distance_miles ? parseFloat(hikeForm.distance_miles) : null,
        elevation_gain: hikeForm.elevation_gain ? parseInt(hikeForm.elevation_gain) : null,
        notes: hikeForm.notes,
      })
      closeModal()
      loadHikes()
    } catch (err) {
      console.error('Failed to log hike:', err)
      alert('Failed to log hike. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const getTrailName = (trailId) => {
    const trail = trails.find(t => t.id === trailId)
    return trail?.name || `Trail ${trailId}`
  }

  const getParkForTrail = (trailId) => {
    const trail = trails.find(t => t.id === trailId)
    if (!trail) return 'Unknown'
    const park = parks.find(p => p.id === trail.park_id)
    return park?.name || 'Unknown Park'
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Loading your hikes...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">My Hikes</h1>
          <p className="text-gray-600">Track your hiking adventures</p>
        </div>
        <button 
          onClick={openModal}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Log Hike
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {hikes.length > 0 ? (
        <div className="space-y-4">
          {hikes.map(hike => (
            <div key={hike.id} className="card hover:shadow-lg transition-shadow">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="font-semibold text-lg">{getTrailName(hike.trail_id)}</p>
                  <p className="text-sm text-gray-600">{getParkForTrail(hike.trail_id)}</p>
                </div>
                {hike.distance_miles && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <MapPin className="w-4 h-4" />
                    <span>{hike.distance_miles} mi</span>
                  </div>
                )}
                {hike.elevation_gain && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Activity className="w-4 h-4" />
                    <span>+{hike.elevation_gain} ft</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>{new Date(hike.hike_date).toLocaleDateString()}</span>
                </div>
              </div>
              {hike.notes && (
                <p className="mt-3 text-sm text-gray-700 border-t pt-3">{hike.notes}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 card">
          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No hikes logged yet. Start tracking your adventures!</p>
          <button 
            onClick={openModal}
            className="btn btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Log Your First Hike
          </button>
        </div>
      )}

      {/* Log Hike Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-screen overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Log Hike</h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogHike} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trail *
                </label>
                <select
                  name="trail_id"
                  value={hikeForm.trail_id}
                  onChange={handleHikeChange}
                  required
                  className="input-field"
                >
                  <option value="">Select a trail...</option>
                  {trails.map(trail => {
                    const park = parks.find(p => p.id === trail.park_id)
                    return (
                      <option key={trail.id} value={trail.id}>
                        {trail.name} ({park?.name || 'Unknown'})
                      </option>
                    )
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Hiked
                </label>
                <input
                  type="date"
                  name="hike_date"
                  value={hikeForm.hike_date}
                  onChange={handleHikeChange}
                  required
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  name="duration_minutes"
                  value={hikeForm.duration_minutes}
                  onChange={handleHikeChange}
                  min="1"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Distance (miles)
                </label>
                <input
                  type="number"
                  name="distance_miles"
                  value={hikeForm.distance_miles}
                  onChange={handleHikeChange}
                  placeholder="Optional"
                  step="0.1"
                  min="0"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Elevation Gain (feet)
                </label>
                <input
                  type="number"
                  name="elevation_gain"
                  value={hikeForm.elevation_gain}
                  onChange={handleHikeChange}
                  placeholder="Optional"
                  min="0"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={hikeForm.notes}
                  onChange={handleHikeChange}
                  placeholder="How was the hike? Any observations?"
                  className="input-field h-20 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 btn btn-primary"
                >
                  {submitting ? 'Saving...' : 'Save Hike'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
