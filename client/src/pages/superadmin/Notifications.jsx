import { useEffect, useState } from 'react'
import { Send, Megaphone, Building2, Globe } from 'lucide-react'
import { sendNotification, listAllNotifications } from '../../api/notifications'
import { listStores } from '../../api/stores'
import Card, { CardHeader, CardBody } from '../../components/ui/Card'
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
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

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
      })
      setMessage('')
      setSent(true)
      load()
      setTimeout(() => setSent(false), 3000)
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to send notification'))
    } finally {
      setSending(false)
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
            <div className="divide-y divide-ink-100">
              {notifications.map((n) => (
                <div key={n._id} className="flex items-start gap-3 px-6 py-4">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50">
                    {n.targetStoreId ? (
                      <Building2 size={16} className="text-primary-600" />
                    ) : (
                      <Globe size={16} className="text-primary-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge tone={n.targetStoreId ? 'primary' : 'info'}>
                        {n.targetStoreId ? n.targetStoreId.storeName : 'All stores'}
                      </Badge>
                      <span className="text-xs text-ink-400">{formatDateTime(n.createdAt)}</span>
                    </div>
                    <p className="mt-1.5 text-sm text-ink-700">{n.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
