import { createContext, useContext, useEffect, useRef, useState } from 'react'
import * as authApi from '../api/auth'
import { setAccessToken, setUnauthorizedHandler } from '../api/client'

const AuthContext = createContext(null)
const STORAGE_KEY = 'rental_system_user'
const IDLE_TIMEOUT_MS = 15 * 60 * 1000
const IDLE_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll']

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

  // Merge fresh fields into the signed-in user (e.g. after they edit their
  // own name/phone) so the Topbar and anything else reading `user` updates
  // without a re-login.
  const updateUser = (patch) => {
    setUser((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
      persistUser(next)
      return next
    })
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

  // Used for super-admin "login as store" impersonation, and for restoring
  // the admin's own session afterward. Deliberately memory-only (no
  // persistUser call) — the real admin session stays intact in localStorage
  // and the refresh-token cookie, so a page reload while impersonating just
  // falls back to the real admin session instead of getting stuck.
  const impersonate = (accessToken, impersonatedUser) => {
    setAccessToken(accessToken)
    setUser(impersonatedUser)
  }

  // Auto-logout after 15 minutes of inactivity, for every signed-in role
  // (store owner/staff and super admin alike). `logout` is recreated every
  // render, so it's stashed in a ref that the listener effect reads from —
  // that keeps the effect from tearing down and re-attaching its listeners
  // on every render.
  const logoutRef = useRef(logout)
  useEffect(() => {
    logoutRef.current = logout
  })

  useEffect(() => {
    if (!user) return undefined

    let timer
    const resetTimer = () => {
      clearTimeout(timer)
      timer = setTimeout(() => logoutRef.current(), IDLE_TIMEOUT_MS)
    }

    IDLE_EVENTS.forEach((event) => window.addEventListener(event, resetTimer))
    resetTimer()

    return () => {
      clearTimeout(timer)
      IDLE_EVENTS.forEach((event) => window.removeEventListener(event, resetTimer))
    }
  }, [user])

  return (
    <AuthContext.Provider value={{ user, login, logout, impersonate, updateUser, initializing }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
