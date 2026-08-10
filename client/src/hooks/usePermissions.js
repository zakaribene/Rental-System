import { useEffect, useState } from 'react'
import { listUsers } from '../api/users'
import { useAuth } from '../context/AuthContext'

// STORE_OWNER/SUPER_ADMIN are never restricted. For STORE_STAFF, finds "me"
// in the store's user list (GET /users, already reachable by staff) to read
// my own permissions — no dedicated "current user" endpoint needed. A
// missing/undefined flag means allowed, matching the backend's default.
export default function usePermissions() {
  const { user } = useAuth()
  const [permissions, setPermissions] = useState(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (user?.role !== 'STORE_STAFF') {
      setLoaded(true)
      return
    }
    setLoaded(false)
    listUsers()
      .then((all) => setPermissions(all.find((u) => u._id === user.id)?.permissions || null))
      .catch(() => setPermissions(null))
      .finally(() => setLoaded(true))
  }, [user?.id, user?.role])

  const can = (module, action = 'enabled') => {
    if (user?.role !== 'STORE_STAFF') return true
    return permissions?.[module]?.[action] !== false
  }

  return { can, loaded }
}
