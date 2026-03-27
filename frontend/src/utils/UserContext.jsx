import { createContext, useState, useContext, useEffect } from 'react'

const UserContext = createContext()

export function UserProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load user from localStorage on mount
  useEffect(() => {
    // Try new key first, then fall back to old key for backward compatibility
    let savedUser = localStorage.getItem('parkatlas_user')
    
    // If not found, check for old key and migrate
    if (!savedUser) {
      const oldKey = localStorage.getItem('parktracker_user')
      if (oldKey) {
        savedUser = oldKey
        // Migrate to new key
        localStorage.setItem('parkatlas_user', oldKey)
        localStorage.removeItem('parktracker_user')
      }
    }
    
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (error) {
        console.error('Failed to load user from localStorage:', error)
        localStorage.removeItem('parkatlas_user')
        localStorage.removeItem('parktracker_user')
      }
    }
    setIsLoading(false)
  }, [])

  // Persist user to localStorage when it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('parkatlas_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('parkatlas_user')
    }
  }, [user])

  const logout = () => {
    setUser(null)
  }

  return (
    <UserContext.Provider value={{ user, setUser, logout, isLoading }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within UserProvider')
  }
  return context
}
