import { useEffect, useState } from 'react'
import { Building2, CheckCircle2, XCircle, TrendingUp } from 'lucide-react'
import { listStores } from '../../api/stores'
import StatCard from '../../components/ui/StatCard'
import Card, { CardHeader, CardBody } from '../../components/ui/Card'
import Table from '../../components/ui/Table'
import { StatusBadge } from '../../components/ui/Badge'
import { PageHeader } from '../../components/ui/Misc'
import { formatDate } from '../../lib/utils'
import { Spinner } from '../../components/ui/Misc'

export default function SuperAdminDashboard() {
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listStores()
      .then(setStores)
      .finally(() => setLoading(false))
  }, [])

  const active = stores.filter((s) => s.status === 'active').length
  const inactive = stores.length - active
  const recent = [...stores].slice(0, 6)

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size={32} />
      </div>
    )
  }

  return (
    <div className="animate-fadeIn">
      <PageHeader title="Platform overview" subtitle="A bird's-eye view of every store on the platform." />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total stores" value={stores.length} icon={Building2} tone="primary" />
        <StatCard label="Active stores" value={active} icon={CheckCircle2} tone="success" />
        <StatCard label="Inactive stores" value={inactive} icon={XCircle} tone="danger" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recently onboarded stores"
            subtitle="Latest stores added to the platform"
          />
          <Table
            columns={[
              {
                key: 'storeName',
                header: 'Store',
                render: (row) => <span className="font-semibold text-ink-900">{row.storeName}</span>,
              },
              { key: 'ownerName', header: 'Owner' },
              { key: 'ownerPhone', header: 'Phone' },
              { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
              { key: 'createdAt', header: 'Joined', render: (row) => formatDate(row.createdAt) },
            ]}
            data={recent}
            emptyMessage="No stores yet — create the first one from the Stores page."
          />
        </Card>

        <Card>
          <CardHeader title="Growth" subtitle="Store base composition" />
          <CardBody className="space-y-5">
            <div>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-medium text-ink-600">Active</span>
                <span className="font-bold text-ink-900">
                  {stores.length ? Math.round((active / stores.length) * 100) : 0}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                <div
                  className="h-full rounded-full bg-success-500 transition-all"
                  style={{ width: `${stores.length ? (active / stores.length) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-medium text-ink-600">Inactive</span>
                <span className="font-bold text-ink-900">
                  {stores.length ? Math.round((inactive / stores.length) * 100) : 0}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                <div
                  className="h-full rounded-full bg-danger-500 transition-all"
                  style={{ width: `${stores.length ? (inactive / stores.length) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-primary-50 px-3 py-2.5 text-xs font-medium text-primary-700">
              <TrendingUp size={14} />
              {stores.length} store{stores.length === 1 ? '' : 's'} on the platform
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
