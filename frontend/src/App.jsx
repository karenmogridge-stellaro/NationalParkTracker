import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom'
import { UserProvider, useUser } from './utils/UserContext'
import Dashboard from './pages/Dashboard'
import ParkDirectory from './pages/ParkDirectory'
import MyHikes from './pages/MyHikes'
import Camping from './pages/Camping'
import Auth from './pages/Auth'
import { LogOut, Menu } from 'lucide-react'
import { useState } from 'react'

function AppContent() {
  const { user, logout, isLoading } = useUser()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-4">🏞️</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Auth />
  }

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '🏕️' },
    { path: '/parks', label: 'Park Directory', icon: '🗺️' },
    { path: '/hikes', label: 'My Hikes', icon: '🥾' },
    { path: '/camping', label: 'Camping', icon: '⛺' },
  ]

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'fixed inset-0 z-40' : 'hidden'} md:static md:block w-64 bg-park text-white`}>
        <div className="p-6 border-b border-green-800">
          <h1 className="text-2xl font-bold">🏞️ ParkTracker</h1>
          <p className="text-sm text-green-100 mt-1">Adventure Log</p>
        </div>

        <nav className="p-6 space-y-2">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-green-50 hover:bg-green-700 transition-colors"
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-green-800">
          <p className="text-sm text-green-100 mb-4">Logged in as</p>
          <p className="font-semibold mb-4">{user.name}</p>
          <button
            onClick={() => {
              logout()
              setSidebarOpen(false)
            }}
            className="flex items-center gap-2 w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 hover:bg-gray-100 rounded-lg">
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">National Park Adventures</h1>
        </div>

        <div className="p-6 max-w-7xl mx-auto">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/parks" element={<ParkDirectory />} />
            <Route path="/hikes" element={<MyHikes />} />
            <Route path="/camping" element={<Camping />} />
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <UserProvider>
      <Router>
        <AppContent />
      </Router>
    </UserProvider>
  )
}
