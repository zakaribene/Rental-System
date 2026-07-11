import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FullPageSpinner } from '../components/ui/Misc'

export function ProtectedRoute() {
  const { user, initializing } = useAuth()
  if (initializing) return <FullPageSpinner />
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

export function RoleRoute({ roles }) {
  const { user } = useAuth()
  if (!roles.includes(user?.role)) {
    const fallback = user?.role === 'SUPER_ADMIN' ? '/admin' : '/store'
    return <Navigate to={fallback} replace />
  }
  return <Outlet />
}

export function GuestRoute() {
  const { user, initializing } = useAuth()
  if (initializing) return <FullPageSpinner />
  if (user) return <Navigate to={user.role === 'SUPER_ADMIN' ? '/admin' : '/store'} replace />
  return <Outlet />
}
