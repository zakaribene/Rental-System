import { useEffect, useState } from 'react'
import { Send, Megaphone, Building2, Globe, Pin, X } from 'lucide-react'
import { sendNotification, listAllNotifications, closeBanner } from '../../api/notifications'
import { listStores } from '../../api/stores'
import Card, { CardHeader, CardBody } from '../../components/ui/Card'
import Pagination from '../../components/ui/Pagination'
import usePagination from '../../hooks/usePagination'
import Button from '../../components/ui/Button'
import { Field, Select, Textarea } from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import { PageHeader, EmptyState, Spinner, Alert } from '../../components/ui/Misc'
import { formatDateTime } from '../../lib/utils'
import { apiErrorMessage } from '../../api/client'

export default function AdminNotifications() {
  const [stores, setStores] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [targetStoreId, setTargetStoreId] = useState('all')
  const [message, setMessage] = useState('')
  const [isBanner, setIsBanner] = useState(false)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [closingId, setClosingId] = useState('')

  const load = () => {
    setLoading(true)
    listAllNotifications()
      .then(setNotifications)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    listStores().then(setStores)
    load()
  }, [])

  const { page, setPage, pageCount, pageItems, total, pageSize } = usePagination(notifications, 10)

  const handleSend = async (e) => {
    e.preventDefault()
    setError('')
    setSent(false)
    if (!message.trim()) {
      setError('Write a message before sending.')
      return
    }
    setSending(true)
    try {
      await sendNotification({
        message: message.trim(),
        targetStoreId: targetStoreId === 'all' ? null : targetStoreId,
        isBanner,
      })
      setMessage('')
      setIsBanner(false)
      setSent(true)
      load()
      setTimeout(() => setSent(false), 3000)
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to send notification'))
    } finally {
      setSending(false)
    }
  }

  const handleCloseBanner = async (id) => {
    setClosingId(id)
    try {
      await closeBanner(id)
      load()
    } finally {
      setClosingId('')
    }
  }

  return (
    <div className="animate-fadeIn">
      <PageHeader title="Notifications" subtitle="Send announcements to a single store or broadcast to everyone." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1 h-fit">
          <CardHeader title="Compose" subtitle="Reaches the store console instantly" />
          <CardBody>
            <form onSubmit={handleSend} className="space-y-4">
              {error && <Alert>{error}</Alert>}
              {sent && <Alert tone="success">Notification sent.</Alert>}

              <Field label="Send to" required>
                <Select value={targetStoreId} onChange={(e) => setTargetStoreId(e.target.value)}>
                  <option value="all">All stores</option>
                  {stores.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.storeName}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Message" required>
                <Textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g. Scheduled maintenance tonight from 11pm to midnight."
                  required
                />
              </Field>

              <label className="flex items-start gap-2.5 rounded-lg border border-ink-200 p-3 text-sm dark:border-ink-700">
                <input
                  type="checkbox"
                  checked={isBanner}
                  onChange={(e) => setIsBanner(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-ink-300 text-primary-600 focus:ring-primary-400"
                />
                <span>
                  <span className="flex items-center gap-1.5 font-medium text-ink-700 dark:text-ink-200">
                    <Pin size={14} />
                    Pin as a top banner
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-400">
                    Shows across the top of the store's system. Staff can dismiss it, but it comes back after 5 minutes until you close it here.
                  </span>
                </span>
              </label>

              <Button type="submit" icon={Send} loading={sending} className="w-full">
                Send notification
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Sent history" subtitle="Most recent notifications first" />
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Spinner size={28} />
            </div>
          ) : notifications.length === 0 ? (
            <EmptyState icon={Megaphone} title="No notifications sent yet" />
          ) : (
            <>
              <div className="divide-y divide-ink-100">
                {pageItems.map((n) => (
                  <div key={n._id} className="flex items-start gap-3 px-6 py-4">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50">
                      {n.targetStoreId ? (
                        <Building2 size={16} className="text-primary-600" />
                      ) : (
                        <Globe size={16} className="text-primary-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={n.targetStoreId ? 'primary' : 'info'}>
                          {n.targetStoreId ? n.targetStoreId.storeName : 'All stores'}
                        </Badge>
                        {n.isBanner && (
                          <Badge tone={n.active ? 'warning' : 'neutral'}>{n.active ? 'Banner · active' : 'Banner · closed'}</Badge>
                        )}
                        <span className="text-xs text-ink-400">{formatDateTime(n.createdAt)}</span>
                      </div>
                      <p className="mt-1.5 text-sm text-ink-700">{n.message}</p>
                    </div>
                    {n.isBanner && n.active && (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={X}
                        loading={closingId === n._id}
                        onClick={() => handleCloseBanner(n._id)}
                      >
                        Close
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onChange={setPage} />
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
