import { useEffect, useMemo, useState } from 'react'
import { Package, Users, ClipboardList, Wallet, Clock, PiggyBank, Trophy, Star } from 'lucide-react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts'
import { listProducts } from '../../api/products'
import { listCustomers } from '../../api/customers'
import { listRentals } from '../../api/rentals'
import { getDailyTotals, getSummary, getAnalytics } from '../../api/reports'
import { listPaymentMethods } from '../../api/payments'
import StatCard from '../../components/ui/StatCard'
import Card, { CardHeader } from '../../components/ui/Card'
import Table from '../../components/ui/Table'
import { StatusBadge } from '../../components/ui/Badge'
import { PageHeader, Spinner, EmptyState } from '../../components/ui/Misc'
import { formatMoney, formatDate, cn } from '../../lib/utils'
import { useAuth } from '../../context/AuthContext'

const methodTones = [
  { bg: 'bg-primary-50 dark:bg-primary-500/15', text: 'text-primary-600 dark:text-primary-300', ring: 'ring-primary-100 dark:ring-primary-500/20', glow: 'shadow-[0_0_0_1px_rgba(108,79,255,0.15)] dark:shadow-[0_0_20px_-6px_rgba(139,123,255,0.55)]', chart: '#8b7bff' },
  { bg: 'bg-success-50 dark:bg-success-500/15', text: 'text-success-600 dark:text-success-300', ring: 'ring-success-100 dark:ring-success-500/20', glow: 'shadow-[0_0_0_1px_rgba(16,185,129,0.15)] dark:shadow-[0_0_20px_-6px_rgba(52,211,153,0.55)]', chart: '#34d399' },
  { bg: 'bg-warning-50 dark:bg-warning-500/15', text: 'text-warning-600 dark:text-warning-300', ring: 'ring-warning-100 dark:ring-warning-500/20', glow: 'shadow-[0_0_0_1px_rgba(245,158,11,0.15)] dark:shadow-[0_0_20px_-6px_rgba(251,191,36,0.55)]', chart: '#fbbf24' },
  { bg: 'bg-info-50 dark:bg-info-500/15', text: 'text-info-600 dark:text-info-300', ring: 'ring-info-100 dark:ring-info-500/20', glow: 'shadow-[0_0_0_1px_rgba(59,130,246,0.15)] dark:shadow-[0_0_20px_-6px_rgba(96,165,250,0.55)]', chart: '#60a5fa' },
  { bg: 'bg-danger-50 dark:bg-danger-500/15', text: 'text-danger-600 dark:text-danger-300', ring: 'ring-danger-100 dark:ring-danger-500/20', glow: 'shadow-[0_0_0_1px_rgba(239,68,68,0.15)] dark:shadow-[0_0_20px_-6px_rgba(248,113,113,0.55)]', chart: '#f87171' },
]

const chartTooltipStyle = {
  borderRadius: 12,
  border: '1px solid var(--tooltip-border)',
  background: 'var(--tooltip-bg)',
  color: 'var(--tooltip-text)',
  fontSize: 13,
  boxShadow: '0 8px 24px -8px rgba(15, 16, 23, 0.25)',
}

function PieLegend({ payload }) {
  return (
    <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
      {(payload || []).map((entry) => (
        <div key={entry.value} className="flex items-center gap-1.5 text-xs font-medium text-ink-600 dark:text-ink-300">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          {entry.value}
        </div>
      ))}
    </div>
  )
}

const productStatusMeta = {
  available: { label: 'Available', color: '#10b981' },
  rented: { label: 'Rented', color: '#f59e0b' },
  damaged: { label: 'Damaged', color: '#ef4444' },
  lost: { label: 'Lost', color: '#677185' },
}

function LiveClock() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex items-center gap-3 rounded-xl2 border border-ink-100 bg-white px-5 py-3 shadow-card dark:border-ink-800 dark:bg-ink-900">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 ring-4 ring-primary-100 dark:bg-primary-500/15 dark:ring-primary-500/20">
        <Clock size={18} className="text-primary-600 dark:text-primary-300" />
      </div>
      <div>
        <p className="font-display text-lg font-extrabold tabular-nums tracking-tight text-ink-900 dark:text-white">
          {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
        <p className="text-xs font-medium text-ink-500 dark:text-ink-400">
          {now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>
    </div>
  )
}

export default function StoreDashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [rentals, setRentals] = useState([])
  const [daily, setDaily] = useState({ grandTotal: 0, byMethod: [] })
  const [summary, setSummary] = useState([])
  const [methods, setMethods] = useState([])
  const [analytics, setAnalytics] = useState({ topProducts: [], topCustomers: [], trend: [] })

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    Promise.all([
      listProducts(),
      listCustomers(),
      listRentals('active'),
      getDailyTotals(today).catch(() => ({ grandTotal: 0, byMethod: [] })),
      getSummary({}).catch(() => []),
      listPaymentMethods().catch(() => []),
      getAnalytics().catch(() => ({ topProducts: [], topCustomers: [], trend: [] })),
    ])
      .then(([p, c, r, d, s, m, a]) => {
        setProducts(p)
        setCustomers(c)
        setRentals(r)
        setDaily(d)
        setSummary(s)
        setMethods(m)
        setAnalytics(a)
      })
      .finally(() => setLoading(false))
  }, [])

  const balanceCards = useMemo(() => {
    const methodName = (id) => methods.find((m) => m._id === id)?.name || 'Unknown'
    return summary
      .map((s, i) => ({ ...s, name: methodName(s._id), tone: methodTones[i % methodTones.length] }))
      .sort((a, b) => b.total - a.total)
  }, [summary, methods])

  const chartData = useMemo(
    () => balanceCards.map((s) => ({ name: s.name, total: s.total, fill: s.tone.chart })),
    [balanceCards]
  )

  const statusData = useMemo(() => {
    const counts = products.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1
      return acc
    }, {})
    return Object.entries(counts)
      .filter(([, value]) => value > 0)
      .map(([key, value]) => ({ name: productStatusMeta[key]?.label || key, value, color: productStatusMeta[key]?.color || '#677185' }))
  }, [products])

  const trendData = useMemo(() => analytics.trend.map((t) => ({ period: t.period, total: t.total })), [analytics.trend])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size={32} />
      </div>
    )
  }

  const available = products.filter((p) => p.status === 'available').length
  const allTimeTotal = summary.reduce((sum, s) => sum + s.total, 0)

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title={`Welcome back, ${user?.name?.split(' ')[0] || ''}`}
        subtitle="Here's what's happening in your store today."
        action={<LiveClock />}
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Products available" value={`${available}/${products.length}`} icon={Package} tone="primary" />
        <StatCard label="Customers" value={customers.length} icon={Users} tone="info" />
        <StatCard label="Active rentals" value={rentals.length} icon={ClipboardList} tone="warning" />
        <StatCard label="Collected today" value={formatMoney(daily.grandTotal)} icon={Wallet} tone="success" />
      </div>

      {balanceCards.length > 0 && (
        <div className="mt-8">
          <div className="mb-4 flex items-center gap-2">
            <PiggyBank size={18} className="text-ink-400" />
            <h2 className="font-display text-base font-bold text-ink-900 dark:text-white">All-time balance by payment method</h2>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {balanceCards.map((s) => (
              <div
                key={s._id}
                className="group rounded-xl2 border border-ink-100 bg-white p-5 shadow-card transition-transform hover:-translate-y-0.5 dark:border-ink-800 dark:bg-ink-900"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink-500 dark:text-ink-400">{s.name}</p>
                    <p className="mt-2 font-display text-2xl font-extrabold text-ink-900 dark:text-white">{formatMoney(s.total)}</p>
                  </div>
                  <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-4', s.tone.bg, s.tone.ring, s.tone.glow)}>
                    <Wallet size={20} className={s.tone.text} strokeWidth={2.25} />
                  </div>
                </div>
                <p className="mt-3 text-xs font-semibold text-ink-400">{s.count} transaction(s)</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Balance by payment method" subtitle={`All-time total collected: ${formatMoney(allTimeTotal)}`} />
          <div className="p-4 pt-2">
            {chartData.length === 0 ? (
              <EmptyState icon={Wallet} title="No payment data yet" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    {chartData.map((entry, index) => (
                      <linearGradient key={index} id={`bar-gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={entry.fill} stopOpacity={1} />
                        <stop offset="100%" stopColor={entry.fill} stopOpacity={0.55} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-ink-100 dark:text-ink-800" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#8690a3' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#8690a3' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => formatMoney(value)} contentStyle={chartTooltipStyle} cursor={{ fill: 'var(--chart-cursor)' }} />
                  <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={`url(#bar-gradient-${index})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Inventory status" subtitle="Where your products currently are" />
          <div className="p-4 pt-2">
            {statusData.length === 0 ? (
              <EmptyState icon={Package} title="No products yet" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3} stroke="none">
                    {statusData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend verticalAlign="bottom" height={40} content={<PieLegend />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {trendData.length > 0 && (
        <div className="mt-8">
          <Card>
            <CardHeader title="Revenue trend" subtitle={`Net collected per ${trendData.length > 6 ? 'week' : 'month'}`} />
            <div className="p-4 pt-2">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trendData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trend-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b7bff" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#8b7bff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-ink-100 dark:text-ink-800" vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 12, fill: '#8690a3' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#8690a3' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => formatMoney(value)} contentStyle={chartTooltipStyle} />
                  <Area type="monotone" dataKey="total" stroke="#6c4fff" strokeWidth={2.5} fill="url(#trend-gradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Top products" subtitle="Most rented items" />
          <div className="p-2">
            {analytics.topProducts.length === 0 ? (
              <EmptyState icon={Trophy} title="No rentals yet" />
            ) : (
              <div className="divide-y divide-ink-50 dark:divide-ink-800">
                {analytics.topProducts.map((p, i) => (
                  <div key={p._id || i} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary-600 dark:bg-primary-500/15 dark:text-primary-300">
                        {i + 1}
                      </span>
                      <p className="text-sm font-semibold text-ink-800 dark:text-ink-100">{p.name || 'Unknown product'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-ink-900 dark:text-white">{p.rentals} rented</p>
                      <p className="text-xs text-ink-400">{formatMoney(p.revenue)} revenue</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Top customers" subtitle="Highest revenue generated" />
          <div className="p-2">
            {analytics.topCustomers.length === 0 ? (
              <EmptyState icon={Star} title="No customers yet" />
            ) : (
              <div className="divide-y divide-ink-50 dark:divide-ink-800">
                {analytics.topCustomers.map((c, i) => (
                  <div key={c._id || i} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success-50 text-xs font-bold text-success-600 dark:bg-success-500/15 dark:text-success-300">
                        {i + 1}
                      </span>
                      <p className="text-sm font-semibold text-ink-800 dark:text-ink-100">{c.fullName || 'Unknown customer'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-ink-900 dark:text-white">{formatMoney(c.revenue)}</p>
                      <p className="text-xs text-ink-400">{c.rentals} rental(s)</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader title="Active rentals" subtitle="Items currently out with customers" />
          <Table
            columns={[
              { key: 'id', header: 'Rental', render: (row) => <span className="font-mono text-xs text-ink-400">#{row._id.slice(-6)}</span> },
              { key: 'items', header: 'Items', render: (row) => `${row.items?.length || 0} item(s)` },
              { key: 'totalRentFee', header: 'Rent fee', render: (row) => formatMoney(row.totalRentFee) },
              { key: 'dateOut', header: 'Date out', render: (row) => formatDate(row.dateOut) },
              { key: 'expectedReturnDate', header: 'Due', render: (row) => formatDate(row.expectedReturnDate) },
              { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
            ]}
            data={rentals.slice(0, 8)}
            emptyMessage="No active rentals right now."
          />
        </Card>
      </div>
    </div>
  )
}
