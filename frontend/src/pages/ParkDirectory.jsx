import { useState, useEffect } from 'react'
import { MapPin, Star, X, Search, ExternalLink, Clock, Check } from 'lucide-react'
import { parkAPI } from '../utils/api'
import { useUser } from '../utils/UserContext'

export default function ParkDirectory() {
  const { user } = useUser()
  const [parks, setParks] = useState([])
  const [selectedRegion, setSelectedRegion] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedPark, setSelectedPark] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [trails, setTrails] = useState([])
  const [loadingTrails, setLoadingTrails] = useState(false)
  const [selectedTrails, setSelectedTrails] = useState([])
  const [campsites, setCampsites] = useState([])
  const [loadingCampsites, setLoadingCampsites] = useState(false)
  const [selectedCampsite, setSelectedCampsite] = useState(null)
  const [modalTab, setModalTab] = useState('visit') // 'visit', 'hikes', 'camping'
  const [visitForm, setVisitForm] = useState({
    visit_date: new Date().toISOString().split('T')[0],
    duration_days: 1,
    rating: 5,
    highlights: '',
    notes: '',
  })
  const [campingForm, setCampingForm] = useState({
    visit_date: new Date().toISOString().split('T')[0],
    num_nights: 1,
    campsite_id: null,
  })
  const [notificationHours, setNotificationHours] = useState(1)

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
    setSelectedCampsite(null)
    setModalTab('visit')
    loadTrails(park.id)
    loadCampsites(park.id)
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

  const loadCampsites = async (parkId) => {
    setLoadingCampsites(true)
    try {
      const response = await parkAPI.getCampsites(parkId)
      setCampsites(response.data || [])
    } catch (err) {
      console.error('Failed to load campsites:', err)
      setCampsites([])
    } finally {
      setLoadingCampsites(false)
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedPark(null)
    setTrails([])
    setCampsites([])
    setSelectedTrails([])
    setSelectedCampsite(null)
    setModalTab('visit')
    setVisitForm({
      visit_date: new Date().toISOString().split('T')[0],
      duration_days: 1,
      rating: 5,
      highlights: '',
      notes: '',
    })
    setCampingForm({
      visit_date: new Date().toISOString().split('T')[0],
      num_nights: 1,
      campsite_id: null,
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

  const handleCampingChange = (e) => {
    const { name, value } = e.target
    setCampingForm(prev => ({
      ...prev,
      [name]: name === 'num_nights' || name === 'campsite_id' ? parseInt(value) || (name === 'campsite_id' ? null : 1) : value
    }))
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

  const handleLogCampingTrip = async (e) => {
    e.preventDefault()
    if (!selectedPark || !user || !selectedCampsite) {
      alert('Please select a campsite')
      return
    }

    setSubmitting(true)
    try {
      await parkAPI.logCampingTrip(user.id, {
        campsite_id: selectedCampsite,
        ...campingForm
      })
      closeModal()
    } catch (err) {
      console.error('Failed to log camping trip:', err)
      alert('Failed to log camping trip. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const calculateDaysUntilBooking = (bookingOpensDate) => {
    if (!bookingOpensDate) return null
    const now = new Date()
    const bookingDate = new Date(bookingOpensDate)
    const days = Math.ceil((bookingDate - now) / (1000 * 60 * 60 * 24))
    return Math.max(0, days)
  }

  const getRecreationGovUrl = () => {
    const parkNames = {
      1: 'yellowstone-national-park',
      2: 'grand-canyon-national-park',
      3: 'yosemite-national-park',
      4: 'zion-national-park',
      49: 'antelope-canyon',
      50: 'acadia-national-park'
    }
    const parkName = selectedPark ? parkNames[selectedPark.id] || selectedPark.name.toLowerCase().replace(/\s+/g, '-') : 'camping'
    return `https://www.recreation.gov/camping/search?q=${parkName}`
  }

  const handleAddToWishlist = async () => {
    if (!selectedPark || !user || !selectedCampsite) {
      alert('Please select a campsite')
      return
    }

    try {
      await parkAPI.addToWishlist(user.id, {
        campsite_id: selectedCampsite,
        notification_hours_before: notificationHours
      })
      alert('Added to wishlist! You\'ll get notified when bookings open.')
      closeModal()
    } catch (err) {
      console.error('Failed to add to wishlist:', err)
      alert('Failed to add to wishlist. Please try again.')
    }
  }

  const filteredParks = parks
    .filter(p => !selectedRegion || p.region === selectedRegion)
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.state.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold mb-1">Explore National Parks</h1>
        <p className="text-sm text-gray-600">Discover and plan your next adventure</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search parks by name or state..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-park text-sm"
        />
      </div>

      {/* Region Filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedRegion(null)}
          className={`px-3 py-1 text-sm rounded-lg font-medium transition-colors ${
            !selectedRegion ? 'bg-park text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          All
        </button>
        {regions.map(region => (
          <button
            key={region}
            onClick={() => setSelectedRegion(region)}
            className={`px-3 py-1 text-sm rounded-lg font-medium transition-colors ${
              selectedRegion === region ? 'bg-park text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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
        <div className="text-center py-8 card">
          <p className="text-gray-600">No parks found matching your search.</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {filteredParks.map(park => (
            <div key={park.id} className="card p-2 hover:shadow-md transition-shadow flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <MapPin className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <p className="font-semibold text-sm">{park.name}</p>
                    <span className="text-gray-500">Est. {park.established}</span>
                    <span className="text-gray-600">•</span>
                    <span className="text-gray-600">{park.state}</span>
                    <span className="text-gray-600">•</span>
                    <span className="text-gray-600">{park.region}</span>
                    <span className="text-gray-600">•</span>
                    <span className="text-gray-600">{(park.area_sq_miles || park.area).toLocaleString()} sq mi</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => openModal(park)}
                className="btn btn-primary py-1 px-2.5 text-xs flex-shrink-0"
              >
                Log
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
              <div>
                <h2 className="text-2xl font-bold">{selectedPark.name}</h2>
                <p className="text-sm text-gray-600">{selectedPark.state}</p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-0 border-b border-gray-200">
              <button
                onClick={() => setModalTab('visit')}
                className={`flex-1 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                  modalTab === 'visit'
                    ? 'border-park text-park'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Log Visit
              </button>
              <button
                onClick={() => setModalTab('hikes')}
                className={`flex-1 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                  modalTab === 'hikes'
                    ? 'border-park text-park'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Hikes
              </button>
              <button
                onClick={() => setModalTab('camping')}
                className={`flex-1 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                  modalTab === 'camping'
                    ? 'border-park text-park'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Camping
              </button>
            </div>

            {/* Visit Tab */}
            {modalTab === 'visit' && (
              <form onSubmit={handleLogVisit} className="p-6 space-y-4">
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
                              {trail.distance_miles}mi • {trail.difficulty}
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
            )}

            {/* Hikes Tab */}
            {modalTab === 'hikes' && (
              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Trails in {selectedPark.name}
                  </label>
                  {loadingTrails ? (
                    <p className="text-sm text-gray-600">Loading trails...</p>
                  ) : trails.length > 0 ? (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {trails.sort((a, b) => a.name.localeCompare(b.name)).map(trail => (
                        <div key={trail.id} className="p-3 bg-green-50 rounded-lg border border-green-100">
                          <p className="font-medium text-gray-900">{trail.name}</p>
                          <div className="text-xs text-gray-600 space-y-1 mt-1">
                            <p>📏 {trail.distance_miles} miles</p>
                            <p>📈 {trail.elevation_gain_ft.toLocaleString()} ft elevation gain</p>
                            <p>📊 {trail.difficulty}</p>
                            <p>🌞 Best season: {trail.best_season}</p>
                          </div>
                          <p className="text-xs text-gray-700 mt-2">{trail.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 italic">No trails available for this park</p>
                  )}
                </div>
              </div>
            )}

            {/* Camping Tab */}
            {modalTab === 'camping' && (
              <form onSubmit={handleLogCampingTrip} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Campsite
                  </label>
                  {loadingCampsites ? (
                    <p className="text-sm text-gray-600">Loading campsites...</p>
                  ) : campsites.length > 0 ? (
                    <select
                      name="campsite_id"
                      value={selectedCampsite || ''}
                      onChange={(e) => setSelectedCampsite(e.target.value ? parseInt(e.target.value) : null)}
                      className="input-field"
                      required
                    >
                      <option value="">Choose a campsite...</option>
                      {campsites.sort((a, b) => a.name.localeCompare(b.name)).map(campsite => (
                        <option key={campsite.id} value={campsite.id}>
                          {campsite.name} ({campsite.max_occupancy} people)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm text-gray-600 italic">No campsites available for this park</p>
                  )}
                </div>

                {selectedCampsite && campsites.length > 0 && (
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm space-y-3">
                    {(() => {
                      const site = campsites.find(c => c.id === selectedCampsite)
                      if (!site) return null
                      
                      const daysUntil = calculateDaysUntilBooking(site.booking_opens)
                      const bookingOpensDate = site.booking_opens ? new Date(site.booking_opens) : null
                      
                      return (
                        <div>
                          <p className="font-medium text-gray-900">{site.name}</p>
                          <div className="text-gray-700 mt-2 space-y-1 text-xs">
                            <p>🏔️ Elevation: {site.elevation.toLocaleString()} ft</p>
                            <p>👥 Max occupancy: {site.max_occupancy} people</p>
                            <p>💧 Water: {site.has_water ? '✓ Available' : '✗ Not available'}</p>
                            <p>🚽 Toilets: {site.has_toilets ? '✓ Available' : '✗ Not available'}</p>
                          </div>
                          
                          {/* Booking Info */}
                          {bookingOpensDate && (
                            <div className={`mt-3 p-2 rounded flex items-start gap-2 ${
                              daysUntil === 0
                                ? 'bg-green-100'
                                : daysUntil <= 7
                                ? 'bg-orange-100'
                                : 'bg-blue-100'
                            }`}>
                              {daysUntil === 0 ? (
                                <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                              ) : (
                                <Clock className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                              )}
                              <div className="text-xs">
                                <p className="font-semibold">
                                  {daysUntil === 0
                                    ? 'Available now!'
                                    : `Opens in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`}
                                </p>
                                <p className="opacity-75">
                                  {bookingOpensDate.toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </p>
                              </div>
                            </div>
                          )}
                          
                          {/* Recreation.gov Link */}
                          <a
                            href={getRecreationGovUrl()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full mt-3 bg-park text-white py-2 px-2 rounded text-center hover:bg-park/90 transition-colors font-medium text-xs flex items-center justify-center gap-1"
                          >
                            View on Recreation.gov
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )
                    })()}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    name="visit_date"
                    value={campingForm.visit_date}
                    onChange={handleCampingChange}
                    required
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Nights
                  </label>
                  <input
                    type="number"
                    name="num_nights"
                    value={campingForm.num_nights}
                    onChange={handleCampingChange}
                    min="1"
                    max="30"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notify me (hours before booking opens)
                  </label>
                  <select
                    value={notificationHours}
                    onChange={(e) => setNotificationHours(parseInt(e.target.value))}
                    className="input-field"
                  >
                    <option value={1}>1 hour</option>
                    <option value={2}>2 hours</option>
                    <option value={4}>4 hours</option>
                    <option value={6}>6 hours</option>
                    <option value={12}>12 hours</option>
                    <option value={24}>24 hours</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-6">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddToWishlist}
                    disabled={!selectedCampsite}
                    className="flex-1 px-4 py-2 border border-park text-park rounded-lg hover:bg-park/10 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    💾 Wishlist
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !selectedCampsite}
                    className="flex-1 btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Saving...' : 'Log Trip'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
