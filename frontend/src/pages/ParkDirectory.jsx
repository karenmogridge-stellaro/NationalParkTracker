import { useState, useEffect } from 'react'
import { MapPin, Star, X } from 'lucide-react'
import { parkAPI } from '../utils/api'
import { useUser } from '../utils/UserContext'

export default function ParkDirectory() {
  const { user } = useUser()
  const [parks, setParks] = useState([])
  const [selectedRegion, setSelectedRegion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedPark, setSelectedPark] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [trails, setTrails] = useState([])
  const [loadingTrails, setLoadingTrails] = useState(false)
  const [selectedTrails, setSelectedTrails] = useState([])
  const [visitForm, setVisitForm] = useState({
    visit_date: new Date().toISOString().split('T')[0],
    duration_days: 1,
    rating: 5,
    highlights: '',
    notes: '',
  })

  const regions = ['Southwest', 'Rockies', 'Pacific', 'Northeast', 'Southeast', 'Midwest']

  useEffect(() => {
    loadParks()
  }, [])

  const loadParks = async () => {
    setLoading(true)
    try {
      const response = await parkAPI.listParks()
      setParks(response.data)
      setError('')
    } catch (err) {
      console.error('Failed to load parks:', err)
      setError('Failed to load parks. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const openModal = (park) => {
    setSelectedPark(park)
    setSelectedTrails([])
    loadTrails(park.id)
    setShowModal(true)
  }

  const loadTrails = async (parkId) => {
    setLoadingTrails(true)
    try {
      const response = await parkAPI.getTrails(parkId)
      setTrails(response.data || [])
    } catch (err) {
      console.error('Failed to load trails:', err)
      setTrails([])
    } finally {
      setLoadingTrails(false)
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedPark(null)
    setTrails([])
    setSelectedTrails([])
    setVisitForm({
      visit_date: new Date().toISOString().split('T')[0],
      duration_days: 1,
      rating: 5,
      highlights: '',
      notes: '',
    })
  }

  const handleVisitChange = (e) => {
    const { name, value } = e.target
    setVisitForm(prev => ({
      ...prev,
      [name]: name === 'duration_days' || name === 'rating' ? parseInt(value) : value
    }))
  }

  const handleTrailToggle = (trailId) => {
    setSelectedTrails(prev =>
      prev.includes(trailId)
        ? prev.filter(id => id !== trailId)
        : [...prev, trailId]
    )
  }

  const handleLogVisit = async (e) => {
    e.preventDefault()
    if (!selectedPark || !user) return

    setSubmitting(true)
    try {
      await parkAPI.logVisit(user.id, {
        park_id: selectedPark.id,
        ...visitForm,
        visited: true
      })
      closeModal()
      // Optionally reload parks
    } catch (err) {
      console.error('Failed to log visit:', err)
      alert('Failed to log visit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredParks = parks.filter(p => !selectedRegion || p.region === selectedRegion)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Explore National Parks</h1>
        <p className="text-gray-600">Discover and plan your next adventure</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Region Filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedRegion(null)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            !selectedRegion ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
          }`}
        >
          All Regions
        </button>
        {regions.map(region => (
          <button
            key={region}
            onClick={() => setSelectedRegion(region)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedRegion === region ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            {region}
          </button>
        ))}
      </div>

      {/* Parks Grid */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading parks...</p>
        </div>
      ) : filteredParks.length === 0 ? (
        <div className="text-center py-12 card">
          <p className="text-gray-600">No parks found in this region.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredParks.map(park => (
            <div key={park.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-xl font-semibold">{park.name}</h3>
                <MapPin className="w-5 h-5 text-green-600" />
              </div>
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <p>📍 {park.state} • {park.region}</p>
                <p>📅 Established {park.established}</p>
                <p>📐 {(park.area_sq_miles || park.area).toLocaleString()} sq miles</p>
              </div>
              {park.description && (
                <p className="text-sm text-gray-700 mb-4 line-clamp-2">{park.description}</p>
              )}
              <button 
                onClick={() => openModal(park)}
                className="btn btn-primary w-full flex items-center justify-center gap-2 text-sm"
              >
                <Star className="w-4 h-4" />
                Log Visit
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Log Visit Modal */}
      {showModal && selectedPark && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-screen overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Log Visit</h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogVisit} className="p-6 space-y-4">
              <div>
                <p className="text-xl font-semibold text-gray-900">{selectedPark.name}</p>
                <p className="text-sm text-gray-600">{selectedPark.state}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trails Hiked
                </label>
                {loadingTrails ? (
                  <p className="text-sm text-gray-600">Loading trails...</p>
                ) : trails.length > 0 ? (
                  <div className="space-y-2 border border-gray-200 rounded-lg p-3 bg-gray-50 max-h-40 overflow-y-auto">
                    {trails.map(trail => (
                      <label key={trail.id} className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTrails.includes(trail.id)}
                          onChange={() => handleTrailToggle(trail.id)}
                          className="mt-1 rounded"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{trail.name}</p>
                          <p className="text-xs text-gray-600">
                            {trail.distance_miles}mi •{trail.difficulty}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 italic">No trails available for this park</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Visited
                </label>
                <input
                  type="date"
                  name="visit_date"
                  value={visitForm.visit_date}
                  onChange={handleVisitChange}
                  required
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (days)
                </label>
                <input
                  type="number"
                  name="duration_days"
                  value={visitForm.duration_days}
                  onChange={handleVisitChange}
                  min="1"
                  max="365"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rating ⭐ {visitForm.rating}/5
                </label>
                <input
                  type="range"
                  name="rating"
                  min="1"
                  max="5"
                  value={visitForm.rating}
                  onChange={handleVisitChange}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Highlights
                </label>
                <textarea
                  name="highlights"
                  value={visitForm.highlights}
                  onChange={handleVisitChange}
                  placeholder="Best moments or attractions..."
                  className="input-field h-20 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={visitForm.notes}
                  onChange={handleVisitChange}
                  placeholder="Any additional notes..."
                  className="input-field h-16 resize-none"
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
                  {submitting ? 'Saving...' : 'Save Visit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
