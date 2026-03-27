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
  
  // User Preferences
  getUserPreferences: (userId) => api.get(`/users/${userId}/preferences`),
  updateFavoriteParks: (userId, parkIds) => api.post(`/users/${userId}/preferences/favorite-parks`, parkIds),
  updateNotificationDays: (userId, days) => api.post(`/users/${userId}/preferences/notification-days`, days),
  
  // Garmin Integration
  getGarminAuthUrl: (userId) => api.get(`/users/${userId}/garmin/auth-url`),
  saveGarminToken: (userId, authCode) => api.post(`/users/${userId}/garmin/token`, { auth_code: authCode }),
  getGarminStatus: (userId) => api.get(`/users/${userId}/garmin/status`),
  importGarminHikes: (userId, limit = 50) => api.post(`/users/${userId}/garmin/import`, { limit }),
  disconnectGarmin: (userId) => api.delete(`/users/${userId}/garmin/disconnect`),

  // Social Features
  inviteFriend: (userId, friendEmail) => api.post(`/users/${userId}/friends/invite`, { friend_email: friendEmail }),
  getFriendInvitations: (userId) => api.get(`/users/${userId}/friends/invitations`),
  acceptFriendInvitation: (userId, inviterId) => api.post(`/users/${userId}/friends/invitations/${inviterId}/accept`),
  getFriends: (userId) => api.get(`/users/${userId}/friends`),
  getFriendHikes: (userId, friendId, days = 90) => api.get(`/users/${userId}/friends/${friendId}/hikes?days=${days}`),
  tagFriendInHike: (userId, hikeId, friendId) => api.post(`/users/${userId}/hikes/${hikeId}/tag`, { tagged_user_id: friendId }),
  getTaggedHikes: (userId) => api.get(`/users/${userId}/tagged-hikes`),

  // Gamification & Achievements
  getAchievements: (userId) => api.get(`/users/${userId}/achievements`),
  getChallenges: () => api.get('/challenges'),
  getUserChallenges: (userId) => api.get(`/users/${userId}/challenges`),
  getLeaderboard: (sortBy = 'points', limit = 100) => api.get(`/leaderboard?sort_by=${sortBy}&limit=${limit}`),
  getAllBadges: () => api.get('/badges'),
  
  // Recommended Parks
  getRecommendedParks: (userId, limit = 5) => api.get(`/users/${userId}/recommended-parks?limit=${limit}`),
  getParksByRegion: (userId) => api.get(`/users/${userId}/parks-by-region`),
}

export default api