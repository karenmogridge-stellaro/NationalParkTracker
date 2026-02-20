import { useState, useEffect } from 'react'
import { MapPin, Tent, Droplet, AlertCircle, Calendar, Users, X } from 'lucide-react'
import { parkAPI } from '../utils/api'
import { useUser } from '../utils/UserContext'

export default function Camping() {
  const { user } = useUser()
  const [parks, setParks] = useState([])
  const [campsites, setCampsites] = useState([])
  const [selectedPark, setSelectedPark] = useState(null)
  const [camping, setCamping] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedCampsite, setSelectedCampsite] = useState(null)
  
  const [campingForm, setCampingForm] = useState({
    campsite_id: null,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    notes: '',
  })

  useEffect(() => {
    loadParks()
    loadCamping()
  }, [])

  useEffect(() => {
    if (selectedPark) {
      loadCampsites(selectedPark.id)
    }
  }, [selectedPark])

  const loadParks = async () => {
    try {
      const response = await parkAPI.listParks()
      setParks(response.data)
    } catch (err) {
      console.error('Failed to load parks:', err)
    }
  }

  const loadCampsites = async (parkId) => {
    try {
      const response = await parkAPI.getCampsites(parkId)
      setCampsites(response.data || [])
    } catch (err) {
      console.error('Failed to load campsites:', err)
      setCampsites([])
    }
  }

  const loadCamping = async () => {
    if (!user) return
    setLoading(true)
    try {
      const response = await parkAPI.getCampingTrips(user.id)
      setCamping(response.data || [])
    } catch (err) {
      console.error('Failed to load camping trips:', err)
    } finally {
      setLoading(false)
    }
  }

  const openModal = (campsite) => {
    setSelectedCampsite(campsite)
    setCampingForm(prev => ({
      ...prev,
      campsite_id: campsite.id
    }))
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedCampsite(null)
    setCampingForm({
      campsite_id: null,
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      notes: '',
    })
  }

  const handleCampingChange = (e) => {
    const { name, value } = e.target
    setCampingForm(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleLogCamping = async (e) => {
    e.preventDefault()
    if (!user || !selectedCampsite) return

    setSubmitting(true)
    try {
      await parkAPI.logCampingTrip(user.id, campingForm)
      closeModal()
      loadCamping()
    } catch (err) {
      console.error('Failed to log camping trip:', err)
      alert('Failed to log camping trip. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const campingDays = camping.reduce((sum, trip) => {
    if (trip.nights) return sum + trip.nights
    return sum
  }, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Camping Adventures</h1>
        <p className="text-gray-600">Find campsites and plan your camping trips</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <Tent className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Trips Logged</span>
          </div>
          <p className="text-3xl font-bold text-blue-600">{camping.length}</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-5 h-5 text-orange-600" />
            <span className="text-sm font-medium text-orange-900">Camping Nights</span>
          </div>
          <p className="text-3xl font-bold text-orange-600">{campingDays}</p>
        </div>
      </div>

      {/* Park Selection */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Select a Park to Browse Campsites</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {parks.slice(0, 12).map(park => (
            <button
              key={park.id}
              onClick={() => setSelectedPark(park)}
              className={`p-4 rounded-lg font-medium text-center transition-all ${
                selectedPark?.id === park.id
                  ? 'bg-park text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <div className="text-2xl mb-2">🏕️</div>
              <div className="text-sm">{park.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Campsites List */}
      {selectedPark && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Campsites in {selectedPark.name}</h2>
          {campsites.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900">No campsites found</p>
                <p className="text-sm text-yellow-800">There are no campsites listed for this park yet.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {campsites.map(campsite => (
                <div
                  key={campsite.id}
                  className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-lg">{campsite.name}</h3>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {campsite.elevation}ft elevation
                      </p>
                    </div>
                    <span className="text-2xl">⛺</span>
                  </div>

                  <p className="text-gray-700 text-sm mb-4">{campsite.description}</p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Droplet className="w-4 h-4 text-blue-500" />
                      <span>{campsite.has_water ? '✓ Water' : '✗ No water'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <AlertCircle className="w-4 h-4 text-gray-500" />
                      <span>{campsite.has_toilets ? '✓ Toilets' : '✗ No toilets'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-green-500" />
                      <span>Max {campsite.max_occupancy} people</span>
                    </div>
                  </div>

                  <button
                    onClick={() => openModal(campsite)}
                    className="w-full bg-park text-white py-2 rounded-lg hover:bg-park/90 transition-colors font-medium"
                  >
                    Log Camping Trip
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recent Camping Trips */}
      {camping.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Your Camping Trips</h2>
          <div className="space-y-3">
            {camping.slice(0, 5).map(trip => (
              <div key={trip.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-blue-900">
                      {trip.start_date} to {trip.end_date}
                    </p>
                    <p className="text-sm text-blue-700 mt-1">{trip.notes || 'No notes'}</p>
                  </div>
                  <div className="text-right text-sm text-blue-600">
                    {trip.nights} nights
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && selectedCampsite && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">{selectedCampsite.name}</h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleLogCamping} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  name="start_date"
                  value={campingForm.start_date}
                  onChange={handleCampingChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-park"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  name="end_date"
                  value={campingForm.end_date}
                  onChange={handleCampingChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-park"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  name="notes"
                  value={campingForm.notes}
                  onChange={handleCampingChange}
                  placeholder="Add notes about your trip..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-park"
                  rows="3"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-park text-white rounded-lg hover:bg-park/90 disabled:opacity-50"
                >
                  {submitting ? 'Logging...' : 'Log Trip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
