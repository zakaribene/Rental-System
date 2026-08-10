import { Fragment, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MoreVertical } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Spinner } from './Misc'

const toneClasses = {
  default: 'text-ink-600 hover:bg-ink-50 dark:text-ink-300 dark:hover:bg-ink-800',
  danger: 'text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-500/10',
  success: 'text-success-600 hover:bg-success-50 dark:hover:bg-success-500/10',
}

// A "..." button that opens a portal-rendered dropdown of actions, tracking
// the trigger's position so it escapes any table row's overflow clipping.
// items: [{ key, label, icon, onClick, tone: 'default'|'danger'|'success', divider }]
export default function RowActionsMenu({ items, loading = false }) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState(null)
  const buttonRef = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!open) return

    const updateCoords = () => {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (rect) setCoords({ top: rect.bottom + 6, right: window.innerWidth - rect.right })
    }
    updateCoords()

    const handleClickOutside = (e) => {
      if (!buttonRef.current?.contains(e.target) && !menuRef.current?.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    // Menu tracks the trigger button's position — anything that could move
    // it (scroll inside the table, or a window resize) needs to reposition
    // the portal, since it renders outside the table's overflow container.
    window.addEventListener('scroll', updateCoords, true)
    window.addEventListener('resize', updateCoords)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', updateCoords, true)
      window.removeEventListener('resize', updateCoords)
    }
  }, [open])

  const run = (fn) => {
    setOpen(false)
    fn?.()
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-ink-100"
        title="Actions"
      >
        {loading ? <Spinner size={16} /> : <MoreVertical size={18} />}
      </button>

      {open &&
        coords &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: coords.top, right: coords.right }}
            className="z-50 w-56 overflow-hidden rounded-xl border border-ink-100 bg-white py-1.5 text-left shadow-card animate-fadeIn dark:border-ink-800 dark:bg-ink-900"
          >
            {items.map((item, i) => (
              <Fragment key={item.key || i}>
                {item.divider && <div className="my-1.5 border-t border-ink-100 dark:border-ink-800" />}
                <button
                  onClick={() => run(item.onClick)}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors',
                    toneClasses[item.tone || 'default']
                  )}
                >
                  {item.icon && <item.icon size={16} />}
                  {item.label}
                </button>
              </Fragment>
            ))}
          </div>,
          document.body
        )}
    </>
  )
}
