import { createContext, useState, useContext, useEffect } from 'react'

const UserContext = createContext()

export function UserProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('parktracker_user')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (error) {
        console.error('Failed to load user from localStorage:', error)
        localStorage.removeItem('parktracker_user')
      }
    }
    setIsLoading(false)
  }, [])

  // Persist user to localStorage when it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('parktracker_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('parktracker_user')
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
