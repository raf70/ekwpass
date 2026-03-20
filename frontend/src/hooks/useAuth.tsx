import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser, getAuthStatus, login as apiLogin, setup as apiSetup } from '@/api/auth'
import type { User, RegisterRequest } from '@/types'

const TOKEN_KEY = 'ekwpass_token'

interface AuthContextValue {
  user: User | null
  token: string | null
  isLoading: boolean
  isInitialized: boolean | null
  login: (email: string, password: string) => Promise<void>
  setup: (data: RegisterRequest) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem(TOKEN_KEY))
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null)

  useEffect(() => {
    async function bootstrap() {
      try {
        const status = await getAuthStatus()
        setIsInitialized(status.initialized)
      } catch {
        setIsInitialized(null)
      }

      const stored = localStorage.getItem(TOKEN_KEY)
      if (stored) {
        try {
          const me = await getCurrentUser()
          setUser(me)
          setToken(stored)
        } catch {
          localStorage.removeItem(TOKEN_KEY)
          setToken(null)
        }
      }

      setIsLoading(false)
    }

    bootstrap()
  }, [])

  async function login(email: string, password: string) {
    const res = await apiLogin(email, password)
    localStorage.setItem(TOKEN_KEY, res.token)
    setToken(res.token)
    setUser(res.user)
  }

  async function setup(data: RegisterRequest) {
    const res = await apiSetup(data)
    localStorage.setItem(TOKEN_KEY, res.token)
    setToken(res.token)
    setUser(res.user)
    setIsInitialized(true)
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
    navigate('/login')
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, isInitialized, login, setup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
