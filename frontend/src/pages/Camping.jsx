import { useState, useEffect } from 'react'
import { MapPin, Tent, Droplet, AlertCircle, Calendar, Users, X, Star, Clock, ExternalLink, Check } from 'lucide-react'
import { parkAPI } from '../utils/api'
import { useUser } from '../utils/UserContext'

export default function Camping() {
  const { user } = useUser()
  const [parks, setParks] = useState([])
  const [allCampsites, setAllCampsites] = useState([])
  const [wishlist, setWishlist] = useState([])
  const [selectedPark, setSelectedPark] = useState(null)
  const [checkInDate, setCheckInDate] = useState(new Date().toISOString().split('T')[0])
  const [checkOutDate, setCheckOutDate] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0])
  const [notificationHours, setNotificationHours] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedPark) {
      filterCampsites()
    }
  }, [selectedPark, allCampsites])
  const loadData = async () => {
    try {
      const parksData = await parkAPI.listParks()
      setParks(parksData.slice(0, 12))
      
      // Load campsites from first 4 parks (main demo parks)
      const allCamps = []
      for (let i = 1; i <= 4; i++) {
        try {
          const camps = await parkAPI.getCampsites(i)
          allCamps.push(...camps)
        } catch (e) {
          console.warn(`Failed to load campsites for park ${i}`)
        }
      }
      setAllCampsites(allCamps)
      
      if (user?.id) {
        await loadWishlist()
      }
      setLoading(false)
    } catch (error) {
      console.error('Error loading data:', error)
      setLoading(false)
    }
  }

  const filterCampsites = () => {
    // This will trigger when selectedPark changes, updating display via useffect
  }

  const getCampsitesToDisplay = () => {
    if (selectedPark) {
      return allCampsites.filter(cs => cs.park_id === selectedPark)
    }
    return allCampsites
  }

  const loadWishlist = async () => {
    if (!user?.id) return
    try {
      const data = await parkAPI.getWishlist(user.id)
      setWishlist(data)
    } catch (error) {
      console.error('Error loading wishlist:', error)
    }
  }

  const isCampsiteWishlisted = (campsiteId) => {
    return wishlist.some(item => item.campsite_id === campsiteId)
  }

  const handleToggleWishlist = async (campsite) => {
    if (!user?.id) return
    
    try {
      if (isCampsiteWishlisted(campsite.id)) {
        await parkAPI.removeFromWishlist(user.id, campsite.id)
      } else {
        await parkAPI.addToWishlist(user.id, {
          campsite_id: campsite.id,
          notification_hours_before: notificationHours
        })
      }
      await loadWishlist()
    } catch (error) {
      console.error('Error toggling wishlist:', error)
    }
  }

  const handleUpdateNotification = async (campsiteId, hours) => {
    if (!user?.id) return
    
    try {
      await parkAPI.updateWishlistPreferences(user.id, campsiteId, {
        notification_hours_before: hours
      })
      await loadWishlist()
    } catch (error) {
      console.error('Error updating notification preferences:', error)
    }
  }

  const getRecreationGovUrl = (campgroundId = null) => {
    const parkNames = {
      1: 'yellowstone-national-park',
      2: 'grand-canyon-national-park',
      3: 'yosemite-national-park',
      4: 'zion-national-park'
    }
    const parkName = selectedPark ? parkNames[selectedPark] : 'camping'
    const baseUrl = `https://www.recreation.gov/camping/search?q=${parkName}`
    
    if (checkInDate && checkOutDate) {
      return `${baseUrl}&date=${checkInDate}T00:00:00.000Z`
    }
    return baseUrl
  }

  const calculateNights = () => {
    if (checkInDate && checkOutDate) {
      const check_in = new Date(checkInDate)
      const check_out = new Date(checkOutDate)
      return Math.ceil((check_out - check_in) / (1000 * 60 * 60 * 24))
    }
    return 0
  }

  const calculateDaysUntilBooking = (bookingOpensDate) => {
    if (!bookingOpensDate) return null
    const now = new Date()
    const bookingDate = new Date(bookingOpensDate)
    const days = Math.ceil((bookingDate - now) / (1000 * 60 * 60 * 24))
    return Math.max(0, days)
  }

  const getBookingStatus = (campsite) => {
    if (!campsite.booking_opens) return 'available'
    
    const daysUntil = calculateDaysUntilBooking(campsite.booking_opens)
    if (daysUntil === 0) return 'available'
    if (daysUntil <= 7) return 'coming_soon'
    return 'coming_later'
  }
  const nights = calculateNights()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Find Campsites</h1>
        <p className="text-gray-600">Search for campsites and manage your wishlist</p>
      </div>

      {/* Search & Booking Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Booking Dates</h2>
            <p className="text-sm text-gray-600">(Optional - for booking reference)</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Check-in Date</label>
            <input
              type="date"
              value={checkInDate}
              onChange={(e) => setCheckInDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-park"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Check-out Date</label>
            <input
              type="date"
              value={checkOutDate}
              onChange={(e) => setCheckOutDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-park"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
            <div className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 font-medium">
              {nights} night{nights !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Park Selection (Optional) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Filter by Park</h2>
          {selectedPark && (
            <button
              onClick={() => setSelectedPark(null)}
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Clear filter
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <button
            onClick={() => setSelectedPark(null)}
            className={`p-4 rounded-lg font-medium text-center transition-all text-sm ${
              selectedPark === null
                ? 'bg-park text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Parks
          </button>
          {parks.map(park => (
            <button
              key={park.id}
              onClick={() => setSelectedPark(park.id)}
              className={`p-4 rounded-lg font-medium text-center transition-all text-sm ${
                selectedPark === park.id
                  ? 'bg-park text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {park.name}
            </button>
          ))}
        </div>
      </div>

      {/* Campsites Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">
          {selectedPark 
            ? `Campsites - ${parks.find(p => p.id === selectedPark)?.name || 'All Parks'}`
            : 'All Campsites'}
        </h2>
        
        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading campsites...</div>
        ) : getCampsitesToDisplay().length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-yellow-900">No campsites found</p>
              <p className="text-sm text-yellow-800">There are no campsites listed in this selection.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getCampsitesToDisplay().map(campsite => {
              const isWishlisted = isCampsiteWishlisted(campsite.id)
              const daysUntilBooking = calculateDaysUntilBooking(campsite.booking_opens)
              const bookingStatus = getBookingStatus(campsite)
              const bookingOpensDate = campsite.booking_opens ? new Date(campsite.booking_opens) : null
                
                return (
                  <div
                    key={campsite.id}
                    className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <div className="p-5 space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg">{campsite.name}</h3>
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {campsite.elevation}ft elevation
                          </p>
                        </div>
                        <button
                          onClick={() => handleToggleWishlist(campsite)}
                          className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                            isWishlisted 
                              ? 'bg-yellow-100 text-yellow-500 hover:bg-yellow-200' 
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                          title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                        >
                          <Star className={`w-6 h-6 ${isWishlisted ? 'fill-current' : ''}`} />
                        </button>
                      </div>

                      {/* Amenities */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Droplet className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          <span className="text-gray-700">{campsite.has_water ? '✓ Water available' : '✗ No water'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <AlertCircle className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          <span className="text-gray-700">{campsite.has_toilets ? '✓ Toilets' : '✗ No toilets'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span className="text-gray-700">Max {campsite.max_occupancy} people</span>
                        </div>
                      </div>

                      {/* Booking Status */}
                      {bookingOpensDate && (
                        <div className={`p-3 rounded-lg flex items-start gap-3 ${
                          bookingStatus === 'available' 
                            ? 'bg-green-50 border border-green-200'
                            : bookingStatus === 'coming_soon'
                            ? 'bg-orange-50 border border-orange-200'
                            : 'bg-blue-50 border border-blue-200'
                        }`}>
                          {bookingStatus === 'available' ? (
                            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          ) : (
                            <Clock className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                          )}
                          <div className={`text-sm ${
                            bookingStatus === 'available'
                              ? 'text-green-800'
                              : bookingStatus === 'coming_soon'
                              ? 'text-orange-800'
                              : 'text-blue-800'
                          }`}>
                            <p className="font-semibold">
                              {bookingStatus === 'available'
                                ? 'Available now!'
                                : bookingStatus === 'coming_soon'
                                ? `Opens in ${daysUntilBooking} day${daysUntilBooking !== 1 ? 's' : ''}`
                                : `Opens in ${daysUntilBooking} days`}
                            </p>
                            <p className="text-xs opacity-75">
                              {bookingOpensDate.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Book Button */}
                      <a
                        href={getRecreationGovUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-park text-white py-2 rounded-lg hover:bg-park/90 transition-colors font-medium flex items-center justify-center gap-2"
                      >
                        Book on Recreation.gov
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
        )}
      </div>

      {/* Wishlist Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-500" />
            Your Campsite Wishlist
          </h2>
          <span className="text-sm text-gray-600">{wishlist.length} item{wishlist.length !== 1 ? 's' : ''}</span>
        </div>

        {wishlist.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">No campsites wishlisted yet</p>
            <p className="text-sm text-gray-500">Star campsites to track booking windows and get alerts</p>
          </div>
        ) : (
          <div className="space-y-3">
            {wishlist.map(item => {
              const daysUntil = calculateDaysUntilBooking(item.booking_opens)
              const bookingOpensDate = item.booking_opens ? new Date(item.booking_opens) : null
              const isAvailable = daysUntil === 0 || !item.booking_opens
              
              return (
                <div key={item.id} className="bg-white border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{item.campsite_name}</h3>
                      <p className="text-sm text-gray-600">{item.park_name}</p>
                    </div>
                    <button
                      onClick={() => handleToggleWishlist({ id: item.campsite_id })}
                      className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0"
                      title="Remove from wishlist"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Booking Status */}
                  {bookingOpensDate && (
                    <div className={`p-3 rounded-lg flex items-start gap-3 mb-3 ${
                      isAvailable
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-orange-50 border border-orange-200'
                    }`}>
                      {isAvailable ? (
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <Clock className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div className={`text-sm flex-1 ${
                        isAvailable ? 'text-green-800' : 'text-orange-800'
                      }`}>
                        <p className="font-semibold">
                          {isAvailable
                            ? 'Now available!'
                            : `Opens in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`}
                        </p>
                        <p className="text-xs opacity-75">
                          {bookingOpensDate.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Notification Preference */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      Notify me before opening:
                    </label>
                    <select
                      value={item.notification_hours_before || 1}
                      onChange={(e) => handleUpdateNotification(item.campsite_id, parseInt(e.target.value))}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-park"
                    >
                      <option value={1}>1 hour before</option>
                      <option value={6}>6 hours before</option>
                      <option value={12}>12 hours before</option>
                      <option value={24}>1 day before</option>
                    </select>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
