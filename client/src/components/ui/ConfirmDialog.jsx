import { AlertTriangle } from 'lucide-react'
import Modal from './Modal'
import Button from './Button'
import { cn } from '../../lib/utils'

// App-styled stand-in for the browser's native confirm() — same look as
// every other modal (Products, Rentals, etc.) instead of an unstyled
// "localhost says" popup.
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  loading = false,
  error,
}) {
  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={tone} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3.5">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
            tone === 'danger'
              ? 'bg-danger-50 text-danger-600 dark:bg-danger-500/15 dark:text-danger-400'
              : 'bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400'
          )}
        >
          <AlertTriangle size={18} />
        </div>
        <div className="flex-1 pt-1.5">
          <p className="text-sm text-ink-600 dark:text-ink-300">{message}</p>
          {error && <p className="mt-2 text-sm font-medium text-danger-600 dark:text-danger-400">{error}</p>}
        </div>
      </div>
    </Modal>
  )
}
