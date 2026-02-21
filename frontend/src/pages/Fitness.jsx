import { useState, useEffect } from 'react'
import { Activity, AlertCircle, CheckCircle, Clock, Download, LogOut, Zap } from 'lucide-react'
import { parkAPI } from '../utils/api'
import { useUser } from '../utils/UserContext'

export default function Fitness() {
  const { user } = useUser()
  const [garminConnected, setGarminConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [importStats, setImportStats] = useState(null)
  const [lastSync, setLastSync] = useState(null)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  useEffect(() => {
    if (user?.id) {
      checkGarminStatus()
    }
  }, [user])

  const checkGarminStatus = async () => {
    try {
      const response = await parkAPI.getGarminStatus(user.id)
      setGarminConnected(response.data?.connected || false)
      if (response.data?.last_sync) {
        setLastSync(new Date(response.data.last_sync))
      }
      setLoading(false)
    } catch (err) {
      console.error('Error checking Garmin status:', err)
      setLoading(false)
    }
  }

  const handleConnectGarmin = async () => {
    try {
      const response = await parkAPI.getGarminAuthUrl(user.id)
      const { auth_url } = response.data
      window.location.href = auth_url
    } catch (err) {
      console.error('Error getting Garmin auth URL:', err)
      setError('Failed to connect to Garmin. Please try again.')
    }
  }

  const handleImportHikes = async () => {
    setImporting(true)
    setError(null)
    setSuccessMessage(null)
    
    try {
      const response = await parkAPI.importGarminHikes(user.id, 50)
      const stats = response.data
      
      setImportStats(stats)
      setLastSync(new Date())
      setSuccessMessage(`Successfully imported ${stats.imported_hikes} hikes!`)
      
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (err) {
      console.error('Error importing hikes:', err)
      setError(err.response?.data?.detail || 'Failed to import hikes. Please try again.')
    } finally {
      setImporting(false)
    }
  }

  const handleDisconnectGarmin = async () => {
    if (!confirm('Are you sure you want to disconnect Garmin? This will stop syncing new activities.')) {
      return
    }
    
    try {
      await parkAPI.disconnectGarmin(user.id)
      setGarminConnected(false)
      setImportStats(null)
      setSuccessMessage('Garmin account disconnected')
      
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      console.error('Error disconnecting Garmin:', err)
      setError('Failed to disconnect Garmin. Please try again.')
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Fitness Tracker Integration</h1>
        <p className="text-gray-600">Connect your fitness tracking apps to automatically import your hiking activities</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-900">Error</p>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <p className="text-green-800">{successMessage}</p>
        </div>
      )}

      {/* Garmin Connect Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Garmin Connect</h2>
                <p className="text-sm text-gray-600">Import hiking and running activities</p>
              </div>
            </div>
          </div>
          
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            garminConnected 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {garminConnected ? 'Connected' : 'Not Connected'}
          </div>
        </div>

        {garminConnected ? (
          <div className="space-y-4">
            {lastSync && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-blue-800">
                  <Clock className="w-4 h-4" />
                  <span>Last synced: {lastSync.toLocaleDateString()} at {lastSync.toLocaleTimeString()}</span>
                </div>
              </div>
            )}

            {importStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{importStats.imported_hikes}</p>
                  <p className="text-sm text-gray-600">Hikes Imported</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{importStats.total_distance_miles}</p>
                  <p className="text-sm text-gray-600">Miles</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-orange-600">{importStats.total_elevation_ft}</p>
                  <p className="text-sm text-gray-600">Ft Elevation</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-purple-600">{importStats.total_activities}</p>
                  <p className="text-sm text-gray-600">Total Activities</p>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleImportHikes}
                disabled={importing}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
              >
                <Download className="w-4 h-4" />
                {importing ? 'Importing...' : 'Import Hikes'}
              </button>
              
              <button
                onClick={handleDisconnectGarmin}
                className="flex-1 border border-red-300 text-red-600 py-2 px-4 rounded-lg hover:bg-red-50 flex items-center justify-center gap-2 font-medium"
              >
                <LogOut className="w-4 h-4" />
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-6 text-center space-y-4">
            <Activity className="w-12 h-12 text-gray-400 mx-auto" />
            <div>
              <p className="text-gray-700 font-medium mb-2">Connect your Garmin account</p>
              <p className="text-sm text-gray-600">
                Securely sync your hiking and running activities from Garmin Connect to automatically log them in your hiking journal.
              </p>
            </div>
            
            <button
              onClick={handleConnectGarmin}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 font-medium"
            >
              Connect Garmin Account
            </button>
          </div>
        )}
      </div>

      {/* Coming Soon Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-bold text-gray-600">Coming Soon</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: 'Strava', icon: '⚡' },
            { name: 'Apple Health', icon: '🍎' },
            { name: 'Fitbit', icon: '💓' }
          ].map(app => (
            <div key={app.name} className="bg-gray-50 rounded-lg p-4 text-center opacity-60">
              <div className="text-3xl mb-2">{app.icon}</div>
              <p className="font-medium text-gray-600">{app.name}</p>
              <p className="text-xs text-gray-500 mt-1">Coming soon</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
