import { useEffect, useRef, useState } from 'react'
import { Headphones, Send, ShieldCheck, Clock3 } from 'lucide-react'
import { getStoreMessages, sendStoreMessage, markStoreRead } from '../../api/support'
import { cn, formatRelativeTime, playChime } from '../../lib/utils'

const POLL_INTERVAL = 5000

export default function Help() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const prevCount = useRef(0)
  const firstLoad = useRef(true)
  const bottomRef = useRef(null)

  useEffect(() => {
    const load = () => {
      getStoreMessages()
        .then((list) => {
          if (!firstLoad.current && list.length > prevCount.current) {
            const last = list[list.length - 1]
            if (last.senderRole === 'SUPER_ADMIN') playChime()
          }
          firstLoad.current = false
          prevCount.current = list.length
          setMessages(list)
          markStoreRead()
        })
        .finally(() => setLoading(false))
    }
    load()
    const interval = setInterval(load, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e) => {
    e.preventDefault()
    const value = text.trim()
    if (!value || sending) return
    setSending(true)
    setText('')
    try {
      const msg = await sendStoreMessage(value)
      setMessages((m) => [...m, msg])
      prevCount.current += 1
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="relative">
      <div className="pointer-events-none absolute -top-10 -left-10 h-72 w-72 rounded-full bg-primary-600/5 blur-3xl dark:bg-primary-600/20" />
      <div className="pointer-events-none absolute -bottom-10 -right-10 h-72 w-72 rounded-full bg-primary-400/5 blur-3xl dark:bg-primary-400/10" />

      <div className="relative flex h-[75vh] min-h-[520px] flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card dark:border-white/10 dark:bg-ink-900">
        <div className="flex items-center gap-3 bg-gradient-to-r from-primary-600 to-primary-700 px-5 py-4 sm:px-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15">
            <Headphones size={20} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-base font-bold text-white">24/7 Support</p>
            <p className="flex items-center gap-1.5 text-xs text-primary-100">
              <span className="h-1.5 w-1.5 rounded-full bg-success-400" />
              We&apos;re online and here to help
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-500/15">
                <ShieldCheck size={26} className="text-primary-500" />
              </div>
              <div>
                <p className="font-semibold text-ink-800 dark:text-ink-100">Need a hand?</p>
                <p className="mt-1 max-w-xs text-sm text-ink-500 dark:text-ink-400">
                  Send us a message and our support team will get back to you shortly.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((m) => (
                <div key={m._id} className={cn('flex', m.senderRole === 'STORE' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-soft',
                      m.senderRole === 'STORE'
                        ? 'rounded-br-sm bg-primary-600 text-white'
                        : 'rounded-bl-sm border border-ink-100 bg-ink-50 text-ink-800 dark:border-white/10 dark:bg-white/5 dark:text-ink-100'
                    )}
                  >
                    {m.senderRole !== 'STORE' && (
                      <p className="mb-0.5 text-[11px] font-semibold text-primary-600 dark:text-primary-400">Support Team</p>
                    )}
                    <p className="whitespace-pre-wrap leading-relaxed">{m.message}</p>
                    <p
                      className={cn(
                        'mt-1 flex items-center gap-1 text-[10px]',
                        m.senderRole === 'STORE' ? 'text-primary-100' : 'text-ink-400'
                      )}
                    >
                      <Clock3 size={10} /> {formatRelativeTime(m.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <form className="flex items-center gap-2 border-t border-ink-100 bg-ink-50/50 p-3 dark:border-white/10 dark:bg-black/10" onSubmit={handleSend}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your message..."
            className="h-11 w-full rounded-full border border-ink-200 bg-white px-4 text-sm text-ink-900 placeholder:text-ink-400 transition-colors focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder:text-ink-500 dark:focus:border-primary-400 dark:focus:ring-primary-500/20"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white shadow-pop transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={17} />
          </button>
        </form>
      </div>
    </div>
  )
}
