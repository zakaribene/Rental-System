// A small uppercase label + divider line, used to break long forms (product,
// sale, ...) into visually distinct sections instead of one long field list.
export default function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-2.5 pt-1">
      <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">{children}</span>
      <div className="h-px flex-1 bg-ink-100 dark:bg-ink-800" />
    </div>
  )
}
