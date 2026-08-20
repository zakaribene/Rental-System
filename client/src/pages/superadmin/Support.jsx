import { useEffect, useRef, useState } from 'react'
import { Headphones, Send, MessageCircle } from 'lucide-react'
import { listThreads, getThreadMessages, replyToThread, markThreadRead } from '../../api/support'
import { cn, formatRelativeTime, initials, playChime } from '../../lib/utils'

const POLL_INTERVAL = 8000

export default function Support() {
  const [threads, setThreads] = useState([])
  const [loadingThreads, setLoadingThreads] = useState(true)
  const [activeStoreId, setActiveStoreId] = useState(null)
  const [messages, setMessages] = useState([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const prevUnread = useRef(0)
  const firstLoad = useRef(true)
  const autoSelected = useRef(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

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

  const handleSend = async (e) => {
    e.preventDefault()
    const value = text.trim()
    if (!value || sending || !activeStoreId) return
    setSending(true)
    setText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    try {
      const msg = await replyToThread(activeStoreId, value)
      setMessages((m) => [...m, msg])
      setThreads((list) =>
        list
          .map((t) =>
            t.storeId === activeStoreId
              ? { ...t, lastMessage: value, lastMessageAt: msg.createdAt, lastSenderRole: 'SUPER_ADMIN' }
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
        <div className="border-b border-ink-100 px-4 py-3.5 dark:border-white/10">
          <p className="font-display text-sm font-bold text-ink-900 dark:text-white">Support Inbox</p>
          <p className="text-xs text-ink-400">Messages from stores</p>
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
                        <p className="whitespace-pre-wrap leading-relaxed">{m.message}</p>
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

            <form
              className="flex items-end gap-2 border-t border-ink-100 bg-ink-50/50 p-3 dark:border-white/10 dark:bg-black/10"
              onSubmit={handleSend}
            >
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
                disabled={!text.trim() || sending}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white shadow-pop transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send size={17} />
              </button>
            </form>
          </>
        )}
      </div>
      </div>
    </div>
  )
}
