import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getStoreUnreadCount, getAdminUnreadCount } from '../api/support'
import { playChime } from '../lib/utils'

const POLL_INTERVAL = 10000

// Powers the unread badge on the Sidebar's Help/Support nav item, for
// whichever side (store or super admin) is currently logged in.
export default function useSupportUnread() {
  const { user } = useAuth()
  const [count, setCount] = useState(0)
  const prevCount = useRef(0)
  const firstLoad = useRef(true)
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const isStoreUser = user?.role === 'STORE_OWNER' || user?.role === 'STORE_STAFF'

  useEffect(() => {
    if (!isSuperAdmin && !isStoreUser) return undefined
    const fetchCount = isSuperAdmin ? getAdminUnreadCount : getStoreUnreadCount

    const poll = () => {
      fetchCount()
        .then(({ count: newCount }) => {
          if (!firstLoad.current && newCount > prevCount.current) playChime()
          firstLoad.current = false
          prevCount.current = newCount
          setCount(newCount)
        })
        .catch(() => {})
    }

    poll()
    const interval = setInterval(poll, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [isSuperAdmin, isStoreUser])

  return count
}
