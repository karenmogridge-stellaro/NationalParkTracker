import axios from 'axios'

const API_BASE_URL = 'http://localhost:8001/api/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
})

export const parkAPI = {
  // Users
  createUser: (data) => api.post('/users', data),
  getUser: (userId) => api.get(`/users/${userId}`),
  getUserByEmail: (email) => api.get(`/users/email/${email}`),
  
  // Parks
  listParks: (region, state) => {
    let url = '/parks'
    const params = new URLSearchParams()
    if (region) params.append('region', region)
    if (state) params.append('state', state)
    if (params.toString()) url += '?' + params.toString()
    return api.get(url)
  },
  getPark: (parkId) => api.get(`/parks/${parkId}`),
  
  // Visits
  logVisit: (userId, data) => api.post(`/users/${userId}/visits`, data),
  getVisits: (userId, visitedOnly = true) => api.get(`/users/${userId}/visits?visited_only=${visitedOnly}`),
  
  // Trails
  addTrail: (parkId, data) => api.post(`/parks/${parkId}/trails`, data),
  getTrails: (parkId) => api.get(`/parks/${parkId}/trails`),
  
  // Hikes
  logHike: (userId, data) => api.post(`/users/${userId}/hikes`, data),
  getHikes: (userId, days = 90) => api.get(`/users/${userId}/hikes?days=${days}`),
  
  // Campsites
  addCampsite: (parkId, data) => api.post(`/parks/${parkId}/campsites`, data),
  getCampsites: (parkId) => api.get(`/parks/${parkId}/campsites`),
  
  // Wishlist
  addToWishlist: (userId, data) => api.post(`/users/${userId}/wishlist`, data),
  getWishlist: (userId) => api.get(`/users/${userId}/wishlist`),
  updateWishlistPreferences: (userId, campsiteId, notificationHours) => 
    api.put(`/users/${userId}/wishlist/${campsiteId}?notification_hours=${notificationHours}`),
  removeFromWishlist: (userId, campsiteId) => api.delete(`/users/${userId}/wishlist/${campsiteId}`),
  
  // Camping
  logCampingTrip: (userId, data) => api.post(`/users/${userId}/camping`, data),
  getCampingTrips: (userId) => api.get(`/users/${userId}/camping`),
  
  // Sightings
  logSighting: (userId, data) => api.post(`/users/${userId}/sightings`, data),
  getSightings: (userId) => api.get(`/users/${userId}/sightings`),
  
  // Stats
  getPassport: (userId) => api.get(`/users/${userId}/passport`),
  getUserStats: (userId) => api.get(`/users/${userId}/stats`),
  
  // Garmin Integration
  getGarminAuthUrl: (userId) => api.get(`/users/${userId}/garmin/auth-url`),
  saveGarminToken: (userId, authCode) => api.post(`/users/${userId}/garmin/token`, { auth_code: authCode }),
  getGarminStatus: (userId) => api.get(`/users/${userId}/garmin/status`),
  importGarminHikes: (userId, limit = 50) => api.post(`/users/${userId}/garmin/import`, { limit }),
  disconnectGarmin: (userId) => api.delete(`/users/${userId}/garmin/disconnect`),}

export default api