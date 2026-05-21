/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { AuthUser, AuthResponse } from '../types/auth.types'

type AuthContextType = {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (authResponse: AuthResponse) => void
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const AUTH_KEY = 'authResponse'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authResponse, setAuthResponse] = useState<AuthResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for stored auth response on mount
    const storedAuth = localStorage.getItem(AUTH_KEY)

    if (storedAuth) {
      try {
        const parsedAuth: AuthResponse = JSON.parse(storedAuth)
        const now = new Date()
        const expiresAt = new Date(parsedAuth.expiresAtUtc)
        if (expiresAt > now) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setAuthResponse(parsedAuth)
        } else {
          // Token expired, clear storage
          localStorage.removeItem(AUTH_KEY)
        }
      } catch {
        // Invalid stored data, clear storage
        localStorage.removeItem(AUTH_KEY)
      }
    }

    setIsLoading(false)
  }, [])

  const login = (authData: AuthResponse) => {
    localStorage.setItem(AUTH_KEY, JSON.stringify(authData))
    setAuthResponse(authData)
  }

  const logout = () => {
    localStorage.removeItem(AUTH_KEY)
    setAuthResponse(null)
  }

  const value: AuthContextType = {
    user: authResponse?.user || null,
    isAuthenticated: !!authResponse,
    login,
    logout,
    isLoading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}