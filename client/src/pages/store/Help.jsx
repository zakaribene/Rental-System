import { useEffect, useRef, useState } from 'react'
import { Headphones, Send, ShieldCheck, Clock3, Paperclip, X } from 'lucide-react'
import { getStoreMessages, sendStoreMessage, markStoreRead } from '../../api/support'
import { API_ORIGIN } from '../../api/client'
import { cn, formatRelativeTime, playChime } from '../../lib/utils'

const POLL_INTERVAL = 5000

export default function Help() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [sending, setSending] = useState(false)
  const prevCount = useRef(0)
  const firstLoad = useRef(true)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)

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
    if ((!value && !imageFile) || sending) return
    setSending(true)
    setText('')
    const file = imageFile
    clearImage()
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    try {
      const msg = await sendStoreMessage(value, file)
      setMessages((m) => [...m, msg])
      prevCount.current += 1
    } finally {
      setSending(false)
    }
  }

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
              placeholder="Type your message... (Shift+Enter for a new line)"
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
      </div>
    </div>
  )
}
