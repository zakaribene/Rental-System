import { createContext, useContext, useEffect, useRef, useState } from 'react'
import * as authApi from '../api/auth'
import { setAccessToken, setUnauthorizedHandler } from '../api/client'

const AuthContext = createContext(null)
const STORAGE_KEY = 'rental_system_user'

function readStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function persistUser(user) {
  if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  else localStorage.removeItem(STORAGE_KEY)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [initializing, setInitializing] = useState(true)
  const attempted = useRef(false)

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null)
      setAccessToken(null)
      persistUser(null)
    })
  }, [])

  useEffect(() => {
    if (attempted.current) return
    attempted.current = true

    const stored = readStoredUser()
    if (!stored) {
      setInitializing(false)
      return
    }

    authApi
      .refreshToken()
      .then(({ accessToken }) => {
        setAccessToken(accessToken)
        setUser(stored)
      })
      .catch(() => {
        persistUser(null)
      })
      .finally(() => setInitializing(false))
  }, [])

  const login = async (phone, password) => {
    const data = await authApi.login(phone, password)
    setAccessToken(data.accessToken)
    setUser(data.user)
    persistUser(data.user)
    return data.user
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch {
      // ignore network errors on logout
    }
    setAccessToken(null)
    setUser(null)
    persistUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, initializing }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
