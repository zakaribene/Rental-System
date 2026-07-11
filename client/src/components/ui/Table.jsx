import { cn } from '../../lib/utils'

export default function Table({ columns, data, keyField = '_id', onRowClick, emptyMessage = 'No records yet' }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <p className="text-sm font-medium text-ink-500">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-ink-100 dark:border-ink-800">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn('px-6 py-3 text-xs font-semibold uppercase tracking-wide text-ink-400', col.headerClassName)}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={row[keyField]}
              onClick={() => onRowClick?.(row)}
              className={cn(
                'border-b border-ink-50 last:border-0 transition-colors dark:border-ink-800/60',
                onRowClick && 'cursor-pointer hover:bg-primary-50/40 dark:hover:bg-primary-500/10'
              )}
            >
              {columns.map((col) => (
                <td key={col.key} className={cn('px-6 py-3.5 text-ink-700 dark:text-ink-200', col.className)}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
