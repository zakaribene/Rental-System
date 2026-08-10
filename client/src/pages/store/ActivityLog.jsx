import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { History, FileSpreadsheet, FileDown, Search } from 'lucide-react'
import { listActivityLogs } from '../../api/activityLogs'
import { getMyStore } from '../../api/myStore'
import usePermissions from '../../hooks/usePermissions'
import Card, { CardHeader, CardBody } from '../../components/ui/Card'
import Table from '../../components/ui/Table'
import Pagination from '../../components/ui/Pagination'
import usePagination from '../../hooks/usePagination'
import Button from '../../components/ui/Button'
import Input, { Field, Select } from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import { PageHeader, EmptyState, Spinner } from '../../components/ui/Misc'
import { formatDateTime } from '../../lib/utils'
import { exportActivityLogToExcel, exportActivityLogToPdf } from '../../lib/reportExport'

const MODULE_META = {
  products: { label: 'Products', tone: 'primary' },
  categories: { label: 'Categories', tone: 'primary' },
  customers: { label: 'Customers', tone: 'info' },
  rentals: { label: 'Rentals', tone: 'success' },
  sales: { label: 'Sales', tone: 'warning' },
  payments: { label: 'Payments', tone: 'danger' },
  staff: { label: 'Staff', tone: 'neutral' },
  auth: { label: 'Auth', tone: 'neutral' },
}

export default function ActivityLog() {
  const { can, loaded } = usePermissions()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [store, setStore] = useState(null)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [moduleFilter, setModuleFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [exporting, setExporting] = useState('')

  useEffect(() => {
    getMyStore().then(setStore).catch(() => setStore(null))
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = {}
    if (from) params.from = from
    if (to) params.to = to
    if (moduleFilter !== 'all') params.module = moduleFilter
    listActivityLogs(params)
      .then(setLogs)
      .finally(() => setLoading(false))
  }, [from, to, moduleFilter])

  const query = search.trim().toLowerCase()
  const filtered = query
    ? logs.filter((l) => [l.description, l.userId?.name].some((v) => v?.toLowerCase().includes(query)))
    : logs
  const { page, setPage, pageCount, pageItems, total, pageSize } = usePagination(filtered, 15)

  const handleExport = async (format) => {
    setExporting(format)
    try {
      const rows = filtered.map((l) => ({
        store: store?.storeName || '—',
        date: formatDateTime(l.createdAt),
        user: l.userId?.name || 'Unknown',
        role: l.userId?.role?.replace('_', ' ') || '—',
        module: MODULE_META[l.module]?.label || l.module,
        action: l.action,
        description: l.description,
      }))
      if (format === 'excel') await exportActivityLogToExcel(rows, store)
      else await exportActivityLogToPdf(rows, store)
    } finally {
      setExporting('')
    }
  }

  if (loaded && !can('activityLog')) return <Navigate to="/store" replace />

  return (
    <div className="animate-fadeIn">
      <PageHeader title="Activity Log" subtitle="Who did what, and when, across your store." />

      <Card>
        <CardHeader
          title="All activity"
          subtitle="Every create, edit, delete and login recorded for your store"
          action={
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" icon={FileSpreadsheet} loading={exporting === 'excel'} onClick={() => handleExport('excel')}>
                Excel
              </Button>
              <Button variant="secondary" size="sm" icon={FileDown} loading={exporting === 'pdf'} onClick={() => handleExport('pdf')}>
                PDF
              </Button>
            </div>
          }
        />
        <CardBody>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="From">
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="To">
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
            <Field label="Module">
              <Select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
                <option value="all">All modules</option>
                {Object.entries(MODULE_META).map(([key, m]) => (
                  <option key={key} value={key}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Search">
              <Input icon={Search} placeholder="Description or user..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </Field>
          </div>

          <div className="mt-5">
            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <Spinner size={26} />
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState icon={History} title="No activity recorded" subtitle="Actions taken in your store will show up here." />
            ) : (
              <>
                <Table
                  columns={[
                    { key: 'date', header: 'Date', render: (row) => formatDateTime(row.createdAt) },
                    { key: 'user', header: 'User', render: (row) => row.userId?.name || 'Unknown' },
                    {
                      key: 'module',
                      header: 'Module',
                      render: (row) => {
                        const meta = MODULE_META[row.module] || { label: row.module, tone: 'neutral' }
                        return <Badge tone={meta.tone}>{meta.label}</Badge>
                      },
                    },
                    { key: 'action', header: 'Action', render: (row) => <span className="capitalize">{row.action}</span> },
                    { key: 'description', header: 'Description', className: 'max-w-md whitespace-normal text-ink-600 dark:text-ink-300', render: (row) => row.description },
                  ]}
                  data={pageItems}
                />
                <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onChange={setPage} />
              </>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
