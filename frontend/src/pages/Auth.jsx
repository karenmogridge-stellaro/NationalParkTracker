import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { parkAPI } from '../utils/api'
import { useUser } from '../utils/UserContext'
import { UserPlus, LogIn } from 'lucide-react'

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { setUser } = useUser()
  const navigate = useNavigate()

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!formData.email) {
      setError('Please enter your email')
      return
    }
    
    setLoading(true)
    setError('')
    
    try {
      // For demo, we'll try to get the user by email
      // In a real app, this would be a dedicated login endpoint
      const response = await parkAPI.getUserByEmail(formData.email)
      setUser(response.data)
      navigate('/dashboard')
    } catch (err) {
      setError('Invalid email. Please sign up first or create an account.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    if (!formData.name || !formData.email) {
      setError('Please fill in all fields')
      return
    }
    
    setLoading(true)
    setError('')
    
    try {
      const response = await parkAPI.createUser({
        name: formData.name,
        email: formData.email,
      })
      setUser(response.data)
      navigate('/dashboard')
    } catch (err) {
      setError('Failed to create account. Email may already exist.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 p-4">
      <div className="w-full max-w-md">
        <div className="card shadow-lg">
          <div className="text-center mb-8">
            <h1 className="text-5xl mb-2">🏞️</h1>
            <h2 className="text-3xl font-bold text-gray-900">ParkTracker</h2>
            <p className="text-gray-600 mt-2">Log your national park adventures</p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {isLogin ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <h3 className="text-xl font-semibold mb-6 text-gray-800">Welcome Back</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn btn-primary flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                {loading ? 'Logging in...' : 'Login'}
              </button>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsLogin(false)
                  setError('')
                  setFormData({ name: '', email: '', password: '' })
                }}
                className="w-full px-4 py-2 border-2 border-green-600 text-green-600 font-semibold rounded-lg hover:bg-green-50 transition-colors"
              >
                Create New Account
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              <h3 className="text-xl font-semibold mb-6 text-gray-800">Create Account</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  placeholder="Your Name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn btn-primary flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                {loading ? 'Creating...' : 'Sign Up'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsLogin(true)
                  setError('')
                  setFormData({ name: '', email: '', password: '' })
                }}
                className="w-full text-center text-green-600 font-medium hover:text-green-700"
              >
                Already have an account? Login
              </button>
            </form>
          )}
        </div>

        <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <p className="text-sm text-gray-600">
            <span className="font-semibold">Demo Tip:</span> For testing, you can enter any email address to create an account, or login with any previously created email.
          </p>
        </div>
      </div>
    </div>
  )
}
