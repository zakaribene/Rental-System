import { useEffect, useState } from 'react'
import { History, FileSpreadsheet, FileDown, ShieldCheck, Trash2 } from 'lucide-react'
import { listAllActivityLogs, getActivityLogSettings, updateActivityLogSettings } from '../../api/activityLogs'
import { listStores } from '../../api/stores'
import Card, { CardHeader, CardBody } from '../../components/ui/Card'
import Table from '../../components/ui/Table'
import Pagination from '../../components/ui/Pagination'
import usePagination from '../../hooks/usePagination'
import Button from '../../components/ui/Button'
import Input, { Field, Select } from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import { PageHeader, EmptyState, Spinner, Alert } from '../../components/ui/Misc'
import { formatDateTime } from '../../lib/utils'
import { exportActivityLogToExcel, exportActivityLogToPdf } from '../../lib/reportExport'
import { apiErrorMessage } from '../../api/client'

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

export default function AdminActivityLog() {
  const [stores, setStores] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [storeFilter, setStoreFilter] = useState('all')
  const [moduleFilter, setModuleFilter] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [exporting, setExporting] = useState('')

  const [settings, setSettings] = useState(null)
  const [autoDeleteEnabled, setAutoDeleteEnabled] = useState(false)
  const [retentionDays, setRetentionDays] = useState('30')
  const [settingsError, setSettingsError] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)

  useEffect(() => {
    listStores().then(setStores)
    getActivityLogSettings().then((s) => {
      setSettings(s)
      setAutoDeleteEnabled(!!s.autoDeleteEnabled)
      setRetentionDays(String(s.retentionDays ?? 30))
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = {}
    if (storeFilter !== 'all') params.storeId = storeFilter
    if (moduleFilter !== 'all') params.module = moduleFilter
    if (from) params.from = from
    if (to) params.to = to
    listAllActivityLogs(params)
      .then(setLogs)
      .finally(() => setLoading(false))
  }, [storeFilter, moduleFilter, from, to])

  const { page, setPage, pageCount, pageItems, total, pageSize } = usePagination(logs, 20)

  const handleSaveSettings = async (e) => {
    e.preventDefault()
    setSettingsError('')
    setSettingsSaved(false)
    const days = Number(retentionDays)
    if (!days || days <= 0) {
      setSettingsError('Retention days must be a positive number.')
      return
    }
    setSavingSettings(true)
    try {
      const updated = await updateActivityLogSettings({ autoDeleteEnabled, retentionDays: days })
      setSettings(updated)
      setSettingsSaved(true)
    } catch (err) {
      setSettingsError(apiErrorMessage(err, 'Failed to save settings'))
    } finally {
      setSavingSettings(false)
    }
  }

  const handleExport = async (format) => {
    setExporting(format)
    try {
      const rows = logs.map((l) => ({
        store: l.storeId?.storeName || '—',
        date: formatDateTime(l.createdAt),
        user: l.userId?.name || 'Unknown',
        role: l.userId?.role?.replace('_', ' ') || '—',
        module: MODULE_META[l.module]?.label || l.module,
        action: l.action,
        description: l.description,
      }))
      if (format === 'excel') await exportActivityLogToExcel(rows, null)
      else await exportActivityLogToPdf(rows, null)
    } finally {
      setExporting('')
    }
  }

  return (
    <div className="animate-fadeIn">
      <PageHeader title="Activity Log" subtitle="Monitor activity across every store and control retention." />

      <Card className="mb-6">
        <CardHeader title="Retention policy" subtitle="Applies to every store's activity log" />
        <CardBody>
          {!settings ? (
            <div className="flex h-20 items-center justify-center">
              <Spinner size={24} />
            </div>
          ) : (
            <form onSubmit={handleSaveSettings} className="space-y-4">
              {settingsError && <Alert>{settingsError}</Alert>}
              {settingsSaved && <Alert tone="success">Retention settings saved.</Alert>}

              <label className="flex items-center gap-3 rounded-lg border border-ink-100 p-3 dark:border-ink-800">
                <input
                  type="checkbox"
                  checked={autoDeleteEnabled}
                  onChange={(e) => setAutoDeleteEnabled(e.target.checked)}
                  className="h-4 w-4 accent-primary-600"
                />
                <div>
                  <p className="text-sm font-semibold text-ink-800 dark:text-ink-100">Auto-delete old entries</p>
                  <p className="text-xs text-ink-400">
                    Off by default. When enabled, a daily sweep permanently deletes entries older than the retention window below, across all stores.
                  </p>
                </div>
              </label>

              <div className="flex items-end gap-3">
                <Field label="Retention (days)" className="max-w-[10rem]">
                  <Input
                    type="number"
                    min="1"
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(e.target.value)}
                    disabled={!autoDeleteEnabled}
                  />
                </Field>
                <Button type="submit" icon={ShieldCheck} loading={savingSettings}>
                  Save
                </Button>
              </div>

              {autoDeleteEnabled && (
                <p className="flex items-start gap-1.5 text-xs text-warning-600 dark:text-warning-400">
                  <Trash2 size={14} className="mt-0.5 shrink-0" />
                  Entries older than {retentionDays || '…'} day(s) will be permanently deleted — this cannot be undone.
                </p>
              )}
            </form>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="All activity"
          subtitle="Every create, edit, delete and login recorded across all stores"
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
            <Field label="Store">
              <Select value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)}>
                <option value="all">All stores</option>
                {stores.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.storeName}
                  </option>
                ))}
              </Select>
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
            <Field label="From">
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="To">
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
          </div>

          <div className="mt-5">
            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <Spinner size={26} />
              </div>
            ) : logs.length === 0 ? (
              <EmptyState icon={History} title="No activity recorded" subtitle="Actions taken across stores will show up here." />
            ) : (
              <>
                <Table
                  columns={[
                    { key: 'date', header: 'Date', render: (row) => formatDateTime(row.createdAt) },
                    { key: 'store', header: 'Store', render: (row) => row.storeId?.storeName || '—' },
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
