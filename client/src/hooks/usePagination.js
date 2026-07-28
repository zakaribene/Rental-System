import { useEffect, useState } from 'react'

export default function usePagination(items, pageSize = 10) {
  const [page, setPage] = useState(1)
  const total = items.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  useEffect(() => {
    if (page > pageCount) setPage(1)
  }, [pageCount, page])

  const start = (page - 1) * pageSize
  const pageItems = items.slice(start, start + pageSize)

  return { page, setPage, pageCount, pageItems, total, pageSize }
}
