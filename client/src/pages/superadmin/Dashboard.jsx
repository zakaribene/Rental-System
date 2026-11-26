import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, CheckCircle2, XCircle, TrendingUp, Wallet, Crown, LayoutDashboard, CalendarDays, ChevronRight, BarChart3, PieChart } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { listStores, getStoreAnalytics } from '../../api/stores'
import { formatDate, formatMoney, cn } from '../../lib/utils'
import { Spinner } from '../../components/ui/Misc'

const tones = {
  blue:  { bg: '#eff4ff', fg: '#1262ff' },
  green: { bg: '#e9f8ef', fg: '#16a34a' },
  red:   { bg: '#fdecec', fg: '#dc2626' },
  amber: { bg: '#fff5e6', fg: '#d97706' },
}

function Kpi({ label, value, icon: Icon, tone, foot, footValue, delay = 0 }) {
  return (
    <div className="rd-kpi" style={{ animationDelay: `${delay}ms` }}>
      <div className="rd-kpi-icon" style={{ background: tone.bg }}>
        <Icon size={21} style={{ color: tone.fg }} />
      </div>
      <div className="rd-kpi-lbl">{label}</div>
      <div className="rd-kpi-val" title={String(value)}>{value}</div>
      {foot && (
        <>
          <div className="rd-kpi-divider" />
          <div className="rd-kpi-foot">
            <span className="rd-kpi-foot-lbl">{foot}</span>
            <span className="rd-kpi-foot-val" style={{ color: tone.fg }}>{footValue}</span>
          </div>
        </>
      )}
    </div>
  )
}

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rd-tip">
      <span>{label}</span>
      <b>{formatMoney(payload[0].value)}</b>
    </div>
  )
}

const cols = { gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr) minmax(0,1fr) 90px 100px' }

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
    () => storeAnalytics.map((s, i) => ({ name: s.storeName, revenue: s.revenue, top: i === 0 && s.revenue > 0 })),
    [storeAnalytics]
  )
  const totalPlatformRevenue = storeAnalytics.reduce((sum, s) => sum + s.revenue, 0)
  const topStore = storeAnalytics[0]
  const bottomStore = storeAnalytics.length > 1 ? storeAnalytics[storeAnalytics.length - 1] : null

  const active = stores.filter((s) => s.status === 'active').length
  const inactive = stores.length - active
  const recent = [...stores].slice(0, 6)
  const pct = (n) => (stores.length ? Math.round((n / stores.length) * 100) : 0)

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size={32} />
      </div>
    )
  }

  return (
    <div className="rd-page">
      <header className="rd-head">
        <span className="ic"><LayoutDashboard size={17} /></span>
        <nav aria-label="Breadcrumb">
          <span className="muted">Home</span>
          <span className="muted" aria-hidden="true">/</span>
          <h1>Platform overview</h1>
        </nav>
        <span className="rd-live"><i />Live</span>
        <span className="headline">A bird&apos;s-eye view of every store on the platform</span>
        <div className="tools">
          <span className="rd-chip hidden sm:inline-flex">
            <CalendarDays size={15} />
            {new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <Link to="/admin/stores" className="rd-chip primary">
            All Stores
            <ChevronRight size={14} />
          </Link>
        </div>
      </header>

      <div className="rd-grid3">
        <Kpi delay={0}  label="Total stores"    value={stores.length} icon={Building2}    tone={tones.blue}  foot="On the platform" footValue={stores.length} />
        <Kpi delay={40} label="Active stores"   value={active}        icon={CheckCircle2} tone={tones.green} foot="Share"           footValue={`${pct(active)}%`} />
        <Kpi delay={80} label="Inactive stores" value={inactive}      icon={XCircle}      tone={tones.red}   foot="Share"           footValue={`${pct(inactive)}%`} />
      </div>

      <div className="rd-grid3">
        <Kpi delay={120} label="Platform revenue"        value={formatMoney(totalPlatformRevenue)} icon={Wallet}     tone={tones.green} />
        <Kpi delay={160} label="Top performing store"    value={topStore?.storeName || '—'}        icon={Crown}      tone={tones.blue}  foot="Revenue" footValue={topStore ? formatMoney(topStore.revenue) : '—'} />
        <Kpi delay={200} label="Lowest performing store" value={bottomStore?.storeName || '—'}     icon={TrendingUp} tone={tones.amber} foot="Revenue" footValue={bottomStore ? formatMoney(bottomStore.revenue) : '—'} />
      </div>

      <section className="rd-card">
        <div className="rd-ch">
          <div>
            <h2 className="rd-ct"><BarChart3 size={16} />Revenue by store</h2>
            <p className="rd-cs">Compare net collected revenue across all stores</p>
          </div>
        </div>
        {revenueChartData.length === 0 ? (
          <div className="rd-empty">No revenue data yet</div>
        ) : (
          <div className="rd-chart pt-3">
            <ResponsiveContainer width="100%" height={Math.max(220, revenueChartData.length * 40)}>
              <BarChart data={revenueChartData} layout="vertical" margin={{ top: 6, right: 24, left: 8, bottom: 0 }}>
                <CartesianGrid stroke="#edf1f8" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#7a8499', fontFamily: 'Geist Mono' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12, fill: '#5a6478' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(18,98,255,.06)' }} />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]} barSize={18}>
                  {revenueChartData.map((entry, index) => (
                    <Cell key={index} fill={entry.top ? '#1262ff' : entry.revenue > 0 ? '#bcd0fb' : '#e3e9f5'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <div className="rd-grid21">
        <section className="rd-card">
          <div className="rd-ch">
            <div>
              <h2 className="rd-ct"><Building2 size={16} />Recently onboarded stores</h2>
              <p className="rd-cs">Latest stores added to the platform</p>
            </div>
            <Link to="/admin/stores" className="rd-lk">View all <ChevronRight size={13} /></Link>
          </div>
          <div className="rd-list">
            <div className="rd-th" style={cols}>
              <span>Store</span><span>Owner</span><span>Phone</span><span>Status</span><span className="rd-right">Joined</span>
            </div>
            {recent.length === 0 ? (
              <div className="rd-empty">No stores yet — create the first one from the Stores page.</div>
            ) : recent.map((row, i) => (
              <div key={row._id} className="rd-lr" style={{ ...cols, animationDelay: `${i * 30}ms` }}>
                <span className="rd-name">
                  <span className="rd-av">{(row.storeName || '?').charAt(0).toUpperCase()}</span>
                  <b className="rd-ellipsis font-medium">{row.storeName}</b>
                </span>
                <span className="rd-ellipsis">{row.ownerName}</span>
                <span className="mono rd-ellipsis text-xs">{row.ownerPhone}</span>
                <span><span className={cn('rd-pill', row.status === 'active' ? 'ok' : 'e')}>{row.status}</span></span>
                <span className="rd-date rd-right">{formatDate(row.createdAt)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rd-card">
          <div className="rd-ch">
            <div>
              <h2 className="rd-ct"><PieChart size={16} />Growth</h2>
              <p className="rd-cs">Store base composition</p>
            </div>
          </div>
          <div className="rd-cb">
            <div className="flex items-baseline justify-between text-[13px]">
              <b className="font-semibold">Active vs inactive</b>
              <span className="mono muted text-xs">{stores.length} total</span>
            </div>
            <div className="rd-split mt-3">
              {active > 0 && <span style={{ width: `${pct(active)}%`, background: '#16a34a' }} />}
              {inactive > 0 && <span style={{ width: `${pct(inactive)}%`, background: '#ef4444' }} />}
            </div>
            <div className="rd-st-nums">
              <div>
                <b style={{ color: '#15803d' }}>{active}</b>
                <p className="rd-cs">Active · {pct(active)}%</p>
              </div>
              <div>
                <b style={{ color: '#b42318' }}>{inactive}</b>
                <p className="rd-cs">Inactive · {pct(inactive)}%</p>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-2 rounded-lg bg-[#eef3ff] px-3 py-2.5 text-xs font-medium text-[#1262ff] dark:bg-[rgba(96,165,250,.12)] dark:text-[#93c5fd]">
              <TrendingUp size={14} />
              {stores.length} store{stores.length === 1 ? '' : 's'} on the platform
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
