import { useEffect, useRef, useState } from 'react'
import { Headphones, Send, MessageCircle, Paperclip, X, Settings, ShieldCheck, Trash2 } from 'lucide-react'
import {
  listThreads,
  getThreadMessages,
  replyToThread,
  markThreadRead,
  getSupportSettings,
  updateSupportSettings,
} from '../../api/support'
import { API_ORIGIN, apiErrorMessage } from '../../api/client'
import { cn, formatRelativeTime, initials, playChime } from '../../lib/utils'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Input, { Field } from '../../components/ui/Input'
import { Alert, Spinner } from '../../components/ui/Misc'

const POLL_INTERVAL = 8000

export default function Support() {
  const [threads, setThreads] = useState([])
  const [loadingThreads, setLoadingThreads] = useState(true)
  const [activeStoreId, setActiveStoreId] = useState(null)
  const [messages, setMessages] = useState([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [text, setText] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [sending, setSending] = useState(false)
  const prevUnread = useRef(0)
  const firstLoad = useRef(true)
  const autoSelected = useRef(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState(null)
  const [autoDeleteEnabled, setAutoDeleteEnabled] = useState(false)
  const [retentionDays, setRetentionDays] = useState('30')
  const [settingsError, setSettingsError] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)

  const openSettings = () => {
    setSettingsOpen(true)
    setSettingsSaved(false)
    setSettingsError('')
    getSupportSettings().then((s) => {
      setSettings(s)
      setAutoDeleteEnabled(!!s.autoDeleteEnabled)
      setRetentionDays(String(s.retentionDays ?? 30))
    })
  }

  const handleSaveSettings = async (e) => {
    e.preventDefault()
    setSettingsError('')
    setSettingsSaved(false)
    const days = Number(retentionDays)
    if (autoDeleteEnabled && (!days || days <= 0)) {
      setSettingsError('Retention days must be a positive number.')
      return
    }
    setSavingSettings(true)
    try {
      const updated = await updateSupportSettings({ autoDeleteEnabled, retentionDays: days || 30 })
      setSettings(updated)
      setSettingsSaved(true)
    } catch (err) {
      setSettingsError(apiErrorMessage(err, 'Failed to save settings'))
    } finally {
      setSavingSettings(false)
    }
  }

  useEffect(() => {
    const load = () => {
      listThreads()
        .then((list) => {
          const totalUnread = list.reduce((sum, t) => sum + t.unreadCount, 0)
          if (!firstLoad.current && totalUnread > prevUnread.current) playChime()
          firstLoad.current = false
          prevUnread.current = totalUnread
          setThreads(list)
          if (!autoSelected.current && list.length > 0) {
            autoSelected.current = true
            setActiveStoreId(list[0].storeId)
          }
        })
        .finally(() => setLoadingThreads(false))
    }
    load()
    const interval = setInterval(load, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!activeStoreId) return undefined
    let first = true
    let prevCount = 0
    setLoadingMessages(true)
    const load = () => {
      getThreadMessages(activeStoreId)
        .then((list) => {
          first = false
          prevCount = list.length
          setMessages(list)
          markThreadRead(activeStoreId)
        })
        .finally(() => setLoadingMessages(false))
    }
    load()
    const interval = setInterval(load, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [activeStoreId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handlePickImage = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImageFile(null)
    setImagePreview(null)
  }

  const handleSend = async (e) => {
    e.preventDefault()
    const value = text.trim()
    if ((!value && !imageFile) || sending || !activeStoreId) return
    setSending(true)
    setText('')
    const file = imageFile
    clearImage()
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    try {
      const msg = await replyToThread(activeStoreId, value, file)
      setMessages((m) => [...m, msg])
      setThreads((list) =>
        list
          .map((t) =>
            t.storeId === activeStoreId
              ? { ...t, lastMessage: value || '📷 Photo', lastMessageAt: msg.createdAt, lastSenderRole: 'SUPER_ADMIN' }
              : t
          )
          .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt))
      )
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(e)
    }
  }

  const handleChange = (e) => {
    setText(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  const activeThread = threads.find((t) => t.storeId === activeStoreId)

  return (
    <div className="relative">
      <div className="pointer-events-none absolute -top-10 -left-10 h-72 w-72 rounded-full bg-primary-600/5 blur-3xl dark:bg-primary-600/20" />
      <div className="pointer-events-none absolute -bottom-10 -right-10 h-72 w-72 rounded-full bg-primary-400/5 blur-3xl dark:bg-primary-400/10" />

      <div className="relative grid h-[75vh] min-h-[520px] grid-cols-1 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card dark:border-white/10 dark:bg-ink-900 md:grid-cols-[280px_1fr]">
      <div className="flex flex-col border-b border-ink-100 dark:border-white/10 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between gap-2 border-b border-ink-100 px-4 py-3.5 dark:border-white/10">
          <div>
            <p className="font-display text-sm font-bold text-ink-900 dark:text-white">Support Inbox</p>
            <p className="text-xs text-ink-400">Messages from stores</p>
          </div>
          <button
            onClick={openSettings}
            title="Retention settings"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-white/10 dark:hover:text-ink-200"
          >
            <Settings size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingThreads ? (
            <div className="flex h-24 items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
            </div>
          ) : threads.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <Headphones size={22} className="text-ink-300" />
              <p className="text-sm text-ink-400">No messages yet</p>
            </div>
          ) : (
            threads.map((t) => (
              <button
                key={t.storeId}
                onClick={() => setActiveStoreId(t.storeId)}
                className={cn(
                  'flex w-full items-start gap-3 border-b border-ink-50 px-4 py-3 text-left transition-colors dark:border-white/5',
                  activeStoreId === t.storeId ? 'bg-primary-50 dark:bg-primary-500/10' : 'hover:bg-ink-50 dark:hover:bg-white/5'
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-xs font-bold text-white">
                  {initials(t.storeName)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-ink-800 dark:text-ink-100">{t.storeName}</p>
                    <span className="shrink-0 text-[10px] text-ink-400">{formatRelativeTime(t.lastMessageAt)}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-ink-500 dark:text-ink-400">
                    {t.lastSenderRole === 'SUPER_ADMIN' ? 'You: ' : ''}
                    {t.lastMessage}
                  </p>
                </div>
                {t.unreadCount > 0 && (
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-bold text-white">
                    {t.unreadCount > 99 ? '99+' : t.unreadCount}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-col overflow-hidden">
        {!activeStoreId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-ink-400">
            <MessageCircle size={24} />
            <p className="text-sm">Select a conversation</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2.5 border-b border-ink-100 px-5 py-3.5 dark:border-white/10">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-xs font-bold text-white">
                {initials(activeThread?.storeName)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink-900 dark:text-white">{activeThread?.storeName}</p>
                <p className="truncate text-xs text-ink-400">{activeThread?.ownerName}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
              {loadingMessages ? (
                <div className="flex h-full items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((m) => (
                    <div key={m._id} className={cn('flex', m.senderRole === 'SUPER_ADMIN' ? 'justify-end' : 'justify-start')}>
                      <div
                        className={cn(
                          'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-soft',
                          m.senderRole === 'SUPER_ADMIN'
                            ? 'rounded-br-sm bg-primary-600 text-white'
                            : 'rounded-bl-sm border border-ink-100 bg-ink-50 text-ink-800 dark:border-white/10 dark:bg-white/5 dark:text-ink-100'
                        )}
                      >
                        {m.attachmentUrl && (
                          <a href={`${API_ORIGIN}${m.attachmentUrl}`} target="_blank" rel="noreferrer">
                            <img
                              src={`${API_ORIGIN}${m.attachmentUrl}`}
                              alt="Attachment"
                              className={cn('max-h-56 rounded-xl object-cover', m.message && 'mb-2')}
                            />
                          </a>
                        )}
                        {m.message && <p className="whitespace-pre-wrap leading-relaxed">{m.message}</p>}
                        <p
                          className={cn(
                            'mt-1 text-[10px]',
                            m.senderRole === 'SUPER_ADMIN' ? 'text-primary-100' : 'text-ink-400'
                          )}
                        >
                          {formatRelativeTime(m.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            <div className="border-t border-ink-100 bg-ink-50/50 dark:border-white/10 dark:bg-black/10">
              {imagePreview && (
                <div className="flex items-center gap-2 px-3 pt-3">
                  <div className="relative">
                    <img src={imagePreview} alt="Selected" className="h-16 w-16 rounded-lg object-cover" />
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink-900 text-white shadow-soft hover:bg-ink-800"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              )}
              <form className="flex items-end gap-2 p-3" onSubmit={handleSend}>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePickImage} className="hidden" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-white/10"
                  title="Attach an image"
                >
                  <Paperclip size={18} />
                </button>
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a reply... (Shift+Enter for a new line)"
                  rows={1}
                  className="max-h-[120px] min-h-[44px] w-full resize-none rounded-3xl border border-ink-200 bg-white px-4 py-2.5 text-sm leading-relaxed text-ink-900 placeholder:text-ink-400 transition-colors focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder:text-ink-500 dark:focus:border-primary-400 dark:focus:ring-primary-500/20"
                />
                <button
                  type="submit"
                  disabled={(!text.trim() && !imageFile) || sending}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white shadow-pop transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send size={17} />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
      </div>

      <Modal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Support chat retention"
        subtitle="Controls how long support messages are kept, across every store"
      >
        {!settings ? (
          <div className="flex h-20 items-center justify-center">
            <Spinner size={24} />
          </div>
        ) : (
          <form onSubmit={handleSaveSettings} className="space-y-4">
            {settingsError && <Alert>{settingsError}</Alert>}
            {settingsSaved && <Alert tone="success">Retention settings saved.</Alert>}

            <label className="flex items-center gap-3 rounded-lg border border-ink-100 p-3 dark:border-ink-800">
              <input
                type="checkbox"
                checked={autoDeleteEnabled}
                onChange={(e) => setAutoDeleteEnabled(e.target.checked)}
                className="h-4 w-4 accent-primary-600"
              />
              <div>
                <p className="text-sm font-semibold text-ink-800 dark:text-ink-100">Auto-delete old messages</p>
                <p className="text-xs text-ink-400">
                  Off by default — nothing is ever deleted unless you turn this on. When enabled, a daily sweep
                  permanently deletes support messages older than the window below.
                </p>
              </div>
            </label>

            <div className="flex items-end gap-3">
              <Field label="Retention (days)" className="max-w-[10rem]">
                <Input
                  type="number"
                  min="1"
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(e.target.value)}
                  disabled={!autoDeleteEnabled}
                />
              </Field>
              <Button type="submit" icon={ShieldCheck} loading={savingSettings}>
                Save
              </Button>
            </div>

            {autoDeleteEnabled && (
              <p className="flex items-start gap-1.5 text-xs text-warning-600 dark:text-warning-400">
                <Trash2 size={14} className="mt-0.5 shrink-0" />
                Messages older than {retentionDays || '…'} day(s) will be permanently deleted — this cannot be undone.
              </p>
            )}
          </form>
        )}
      </Modal>
    </div>
  )
}
