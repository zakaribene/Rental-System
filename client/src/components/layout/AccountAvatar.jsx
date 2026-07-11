import { useEffect, useRef, useState } from 'react'
import { Pencil } from 'lucide-react'
import { getMyStore, uploadMyStoreLogo } from '../../api/myStore'
import { useAuth } from '../../context/AuthContext'
import { Avatar, Spinner } from '../ui/Misc'

export default function AccountAvatar({ size = 34 }) {
  const { user } = useAuth()
  const isStoreUser = user?.role === 'STORE_OWNER' || user?.role === 'STORE_STAFF'
  const canEdit = user?.role === 'STORE_OWNER'
  const [logoUrl, setLogoUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!isStoreUser) return
    getMyStore()
      .then((store) => setLogoUrl(store.logoUrl || null))
      .catch(() => {})
  }, [isStoreUser])

  const handleSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const store = await uploadMyStoreLogo(file)
      setLogoUrl(store.logoUrl)
    } catch {
      // silently ignore — user can retry
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {uploading ? (
        <div
          className="flex items-center justify-center rounded-full bg-ink-100 dark:bg-ink-800"
          style={{ width: size, height: size }}
        >
          <Spinner size={size * 0.45} />
        </div>
      ) : (
        <Avatar name={user?.name || user?.role} imageUrl={logoUrl} size={size} />
      )}

      {canEdit && !uploading && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              fileInputRef.current?.click()
            }}
            title="Upload store logo"
            className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary-600 text-white ring-2 ring-white transition-transform hover:scale-110 dark:ring-ink-900"
          >
            <Pencil size={8} strokeWidth={3} />
          </button>
        </>
      )}
    </div>
  )
}
