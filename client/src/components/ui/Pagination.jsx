import { ChevronLeft, ChevronRight } from 'lucide-react'
import Button from './Button'

export default function Pagination({ page, pageCount, total, pageSize, onChange }) {
  if (total === 0) return null

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <div className="flex items-center justify-between border-t border-ink-100 px-6 py-3.5 dark:border-ink-800">
      <p className="text-xs font-medium text-ink-400">
        Showing {start}–{end} of {total}
      </p>
      <div className="flex items-center gap-1.5">
        <Button size="sm" variant="secondary" icon={ChevronLeft} disabled={page <= 1} onClick={() => onChange(page - 1)} />
        <span className="px-2 text-xs font-semibold text-ink-600 dark:text-ink-300">
          {page} / {pageCount}
        </span>
        <Button size="sm" variant="secondary" icon={ChevronRight} disabled={page >= pageCount} onClick={() => onChange(page + 1)} />
      </div>
    </div>
  )
}
