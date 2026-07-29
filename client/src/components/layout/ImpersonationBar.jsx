import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const STASH_KEY = 'impersonation_admin_stash'

export default function ImpersonationBar() {
  const { impersonate } = useAuth()
  const navigate = useNavigate()
  const [stash, setStash] = useState(null)

  useEffect(() => {
    const raw = sessionStorage.getItem(STASH_KEY)
    setStash(raw ? JSON.parse(raw) : null)
  }, [])

  if (!stash) return null

  const handleReturn = () => {
    sessionStorage.removeItem(STASH_KEY)
    impersonate(stash.accessToken, stash.user)
    navigate('/admin/stores')
  }

  return (
    <div className="relative z-30 flex items-center justify-center gap-3 bg-ink-900 px-4 py-2.5 text-sm text-white">
      <Eye size={15} className="shrink-0 text-warning-400" />
      <span>
        Viewing as <strong>{stash.storeName}</strong> — signed in as {stash.viewedName}
      </span>
      <button
        onClick={handleReturn}
        className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold transition-colors hover:bg-white/20"
      >
        <LogOut size={12} />
        Return to admin
      </button>
    </div>
  )
}

export function stashAdminSession(adminAccessToken, adminUser, storeName, viewedName) {
  sessionStorage.setItem(
    STASH_KEY,
    JSON.stringify({ accessToken: adminAccessToken, user: adminUser, storeName, viewedName })
  )
}
