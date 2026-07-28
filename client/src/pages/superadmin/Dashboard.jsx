import { useEffect, useMemo, useState } from 'react'
import { Building2, CheckCircle2, XCircle, TrendingUp, Wallet, Crown } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { listStores, getStoreAnalytics } from '../../api/stores'
import StatCard from '../../components/ui/StatCard'
import Card, { CardHeader, CardBody } from '../../components/ui/Card'
import Table from '../../components/ui/Table'
import { StatusBadge } from '../../components/ui/Badge'
import { PageHeader, EmptyState } from '../../components/ui/Misc'
import { formatDate, formatMoney } from '../../lib/utils'
import { Spinner } from '../../components/ui/Misc'

const chartTooltipStyle = {
  borderRadius: 12,
  border: '1px solid var(--tooltip-border)',
  background: 'var(--tooltip-bg)',
  color: 'var(--tooltip-text)',
  fontSize: 13,
  boxShadow: '0 8px 24px -8px rgba(15, 16, 23, 0.25)',
}

export default function SuperAdminDashboard() {
  const [stores, setStores] = useState([])
  const [storeAnalytics, setStoreAnalytics] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([listStores(), getStoreAnalytics().catch(() => [])])
      .then(([s, a]) => {
        setStores(s)
        setStoreAnalytics(a)
      })
      .finally(() => setLoading(false))
  }, [])

  const revenueChartData = useMemo(
    () =>
      storeAnalytics.map((s) => ({
        name: s.storeName,
        revenue: s.revenue,
        fill: s.revenue > 0 ? '#6c4fff' : '#d5d9e1',
      })),
    [storeAnalytics]
  )
  const totalPlatformRevenue = storeAnalytics.reduce((sum, s) => sum + s.revenue, 0)
  const topStore = storeAnalytics[0]
  const bottomStore = storeAnalytics.length > 1 ? storeAnalytics[storeAnalytics.length - 1] : null

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

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard label="Platform revenue" value={formatMoney(totalPlatformRevenue)} icon={Wallet} tone="success" />
        <StatCard label="Top performing store" value={topStore?.storeName || '—'} icon={Crown} tone="primary" />
        <StatCard label="Lowest performing store" value={bottomStore?.storeName || '—'} icon={TrendingUp} tone="warning" />
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader title="Revenue by store" subtitle="Compare net collected revenue across all stores" />
          <div className="p-4 pt-2">
            {revenueChartData.length === 0 ? (
              <EmptyState icon={Wallet} title="No revenue data yet" />
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(220, revenueChartData.length * 40)}>
                <BarChart data={revenueChartData} layout="vertical" margin={{ top: 10, right: 24, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-ink-100 dark:text-ink-800" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12, fill: '#8690a3' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12, fill: '#8690a3' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => formatMoney(value)} contentStyle={chartTooltipStyle} cursor={{ fill: 'var(--chart-cursor)' }} />
                  <Bar dataKey="revenue" radius={[0, 8, 8, 0]}>
                    {revenueChartData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
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
                render: (row) => <span className="font-semibold text-ink-900 dark:text-white">{row.storeName}</span>,
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
                <span className="font-bold text-ink-900 dark:text-white">
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
                <span className="font-bold text-ink-900 dark:text-white">
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
