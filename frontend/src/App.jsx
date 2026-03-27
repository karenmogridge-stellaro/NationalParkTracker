import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom'
import { UserProvider, useUser } from './utils/UserContext'
import Dashboard from './pages/Dashboard'
import ParkDirectory from './pages/ParkDirectory'
import MyHikes from './pages/MyHikes'
import Fitness from './pages/Fitness'
import Friends from './pages/Friends'
import Auth from './pages/Auth'
import { DashboardIcon, ParkIcon, HikeIcon, FitnessIcon, FriendsIcon } from './components/NavIcon'
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
    { path: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
    { path: '/parks', label: 'Park Directory', icon: ParkIcon },
    { path: '/hikes', label: 'My Hikes', icon: HikeIcon },
    { path: '/fitness', label: 'Integrations', icon: FitnessIcon },
    { path: '/friends', label: 'Friends', icon: FriendsIcon },
  ]

  return (
    <div className="flex h-screen bg-[#f7faf7]">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'fixed inset-0 z-40' : 'hidden'} md:static md:block w-64 bg-white border-r-4 border-green-700`}>
        <div className="p-6 border-b border-green-200">
          <div className="flex items-center gap-3 mb-2">
            <img src="/parkatlas-logo.png" alt="ParkAtlas Logo" className="h-12 w-auto" />
            <h1 className="text-2xl font-bold text-green-800">ParkAtlas</h1>
          </div>
        </div>

        <nav className="p-6 space-y-2">
          {navItems.map(item => {
            const IconComponent = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-green-800 hover:bg-green-100 transition-colors"
              >
                <IconComponent />
                {item.label}
              </Link>
            )
          })}
          
          <button
            onClick={() => {
              logout()
              setSidebarOpen(false)
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-green-800 hover:bg-green-100 transition-colors mt-6 pt-6 border-t border-green-200"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </nav>
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
          <h1 className="text-2xl font-semibold text-gray-900">The Atlas of Your Adventures</h1>
        </div>

        <div className="p-6 max-w-7xl mx-auto">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/parks" element={<ParkDirectory />} />
            <Route path="/hikes" element={<MyHikes />} />
            <Route path="/fitness" element={<Fitness />} />
            <Route path="/friends" element={<Friends />} />
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
