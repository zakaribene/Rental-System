import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, Users, ClipboardList, Wallet, Clock, PiggyBank, Trophy, Star, Home, ChevronRight, CalendarDays, BarChart3 } from 'lucide-react'
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import * as d3 from 'd3'
import * as topojson from 'topojson-client'
import { listProducts } from '../../api/products'
import { listCustomers } from '../../api/customers'
import { listRentals } from '../../api/rentals'
import { getDailyTotals, getSummary, getAnalytics } from '../../api/reports'
import { listPaymentMethods } from '../../api/payments'
import { Spinner } from '../../components/ui/Misc'
import { formatMoney, formatDate, cn } from '../../lib/utils'
import { useAuth } from '../../context/AuthContext'

const methodTones = [
  { bg: 'bg-blue-50 dark:bg-blue-500/15', text: 'text-blue-600 dark:text-blue-300', ring: 'ring-blue-100 dark:ring-blue-500/20', chart: '#3b82f6' },
  { bg: 'bg-emerald-50 dark:bg-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-300', ring: 'ring-emerald-100 dark:ring-emerald-500/20', chart: '#10b981' },
  { bg: 'bg-violet-50 dark:bg-violet-500/15', text: 'text-violet-600 dark:text-violet-300', ring: 'ring-violet-100 dark:ring-violet-500/20', chart: '#8b5cf6' },
  { bg: 'bg-amber-50 dark:bg-amber-500/15', text: 'text-amber-600 dark:text-amber-300', ring: 'ring-amber-100 dark:ring-amber-500/20', chart: '#f59e0b' },
  { bg: 'bg-rose-50 dark:bg-rose-500/15', text: 'text-rose-600 dark:text-rose-300', ring: 'ring-rose-100 dark:ring-rose-500/20', chart: '#f43f5e' },
]

const productStatusMeta = {
  available: { label: 'Available', color: '#10b981' },
  rented:    { label: 'Rented',    color: '#f59e0b' },
  damaged:   { label: 'Damaged',   color: '#ef4444' },
  lost:      { label: 'Lost',      color: '#94a3b8' },
}

function LiveClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <Clock size={16} className="shrink-0 text-slate-400" />
      <div>
        <p className="font-display text-base font-bold tabular-nums text-slate-900 dark:text-white">
          {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
        <p className="text-[11px] text-slate-400">
          {now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>
    </div>
  )
}

function DashStatCard({ label, value, sub, subValue, subTone, icon: Icon, tone, delay = 0 }) {
  return (
    <div className="rd-kpi" style={{ animationDelay: `${delay}ms` }}>
      <div className="rd-kpi-icon" style={{ background: tone.bg }}>
        <Icon size={21} style={{ color: tone.fg }} />
      </div>
      <div className="rd-kpi-lbl">{label}</div>
      <div className="rd-kpi-val" title={String(value)}>{value}</div>
      {sub && (
        <>
          <div className="rd-kpi-divider" />
          <div className="rd-kpi-foot">
            <span className="rd-kpi-foot-lbl">{sub}</span>
            <span className="rd-kpi-foot-val" style={{ color: subTone || tone.fg }}>{subValue}</span>
          </div>
        </>
      )}
    </div>
  )
}

function SectionCard({ title, subtitle, icon: Icon, action, children, className }) {
  return (
    <section className={cn('rd-card', className)}>
      <div className="rd-ch">
        <div>
          <h2 className="rd-ct">{Icon && <Icon size={16} />}{title}</h2>
          {subtitle && <p className="rd-cs">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
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

const kpiTones = {
  blue:   { bg: '#eff4ff', fg: '#1262ff' },
  violet: { bg: '#f3efff', fg: '#7c3aed' },
  amber:  { bg: '#fff5e6', fg: '#d97706' },
  green:  { bg: '#e9f8ef', fg: '#16a34a' },
  rose:   { bg: '#fdecef', fg: '#e11d48' },
}

const pillTone = { active: 'b', overdue: 'e', returned: 'ok', completed: 'ok', cancelled: 'w' }

// ── Globe constants ──────────────────────────────────────────────────────────
const GLOBE_SOM_LON = 45.34, GLOBE_SOM_LAT = 2.05
const GLOBE_W = 500, GLOBE_H = 440
const GLOBE_R0 = Math.min(GLOBE_W, GLOBE_H) / 2 - 6 // ~214px base radius

const GLOBE_CLIST = [
  { lon: 38,   lat: 9,    name: 'Ethiopia',      count: 3 },
  { lon: 36.8, lat: -1.3, name: 'Kenya',         count: 3 },
  { lon: 54,   lat: 23.7, name: 'UAE',           count: 2 },
  { lon: 35,   lat: 39,   name: 'Turkey',        count: 1 },
  { lon: -1,   lat: 52,   name: 'United Kingdom',count: 1 },
  { lon: 17,   lat: 59,   name: 'Sweden',        count: 2 },
  { lon: 15,   lat: -4,   name: 'Congo',         count: 3 },
  { lon: 25,   lat: -29,  name: 'South Africa',  count: 1 },
]

function SomaliMapCard({ customers, rentals }) {
  const gRef    = useRef(null) // D3 renders base globe layers here
  const mapRef  = useRef(null)
  const [arcPaths, setArcPaths] = useState([])
  const [markers,  setMarkers]  = useState([])
  const [loaded,   setLoaded]   = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [spinning, setSpinning] = useState(false)

  const st = useRef({ land: null, rot: [-GLOBE_SOM_LON, -GLOBE_SOM_LAT, 0], k: 1, drag: false, last: null })
  const pinchRef = useRef(null)
  const spinIdRef = useRef(null)
  const custRef = useRef(customers)
  custRef.current = customers

  // Always-current draw function stored in a ref so event handlers never go stale
  const drawRef = useRef(null)

  const makeProj = () =>
    d3.geoOrthographic()
      .rotate(st.current.rot)
      .scale(GLOBE_R0 * st.current.k)
      .translate([GLOBE_W / 2, GLOBE_H / 2])
      .clipAngle(90)

  const draw = () => {
    if (!gRef.current || !st.current.land) return
    const proj = makeProj()
    const path = d3.geoPath().projection(proj)
    const g = d3.select(gRef.current)
    g.selectAll('*').remove()

    g.append('path').datum({ type: 'Sphere' }).attr('d', path)
      .attr('fill', '#f4f8ff').attr('stroke', '#8fb0e4').attr('stroke-width', 1)
    g.append('path').datum(d3.geoGraticule()()).attr('d', path)
      .attr('fill', 'none').attr('stroke', '#cfdcf5').attr('stroke-width', 0.7)
    g.append('path').datum(st.current.land).attr('d', path)
      .attr('fill', '#b9cdef').attr('stroke', '#8fb0e4').attr('stroke-width', 0.5)

    // Update arc d-strings — React elements are stable, only the path changes
    setArcPaths(GLOBE_CLIST.map(c => ({
      name: c.name,
      d: path({ type: 'LineString', coordinates: [[GLOBE_SOM_LON, GLOBE_SOM_LAT], [c.lon, c.lat]] }) || '',
    })))

    // Marker positions
    const all = [
      { lon: GLOBE_SOM_LON, lat: GLOBE_SOM_LAT, name: 'Somalia', count: custRef.current, main: true },
      ...GLOBE_CLIST,
    ]
    setMarkers(all.map(c => {
      const pt = proj([c.lon, c.lat])
      return pt ? { ...c, x: pt[0], y: pt[1] } : null
    }).filter(Boolean))
  }
  drawRef.current = draw

  // Load Natural Earth 110m land (TopoJSON → GeoJSON)
  useEffect(() => {
    d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json')
      .then(world => {
        st.current.land = topojson.feature(world, world.objects.land)
        setLoaded(true)
      })
      .catch(() => {})
  }, [])

  useEffect(() => { if (loaded) drawRef.current() }, [loaded])

  // Passive: false so we can call e.preventDefault() on wheel
  useEffect(() => {
    if (!loaded) return
    const el = mapRef.current
    if (!el) return
    const fn = (e) => {
      e.preventDefault()
      st.current.k = Math.max(0.4, Math.min(12, st.current.k * (e.deltaY < 0 ? 1.12 : 0.89)))
      drawRef.current()
    }
    el.addEventListener('wheel', fn, { passive: false })
    return () => el.removeEventListener('wheel', fn)
  }, [loaded])

  useEffect(() => () => clearInterval(spinIdRef.current), [])

  const onMD = (e) => { st.current.drag = true; st.current.last = [e.clientX, e.clientY]; setIsDragging(true); e.preventDefault() }
  const onMM = (e) => {
    if (!st.current.drag || !st.current.last) return
    const [lx, ly] = st.current.last
    const sp = 0.3 / st.current.k
    st.current.rot[0] -= (e.clientX - lx) * sp
    st.current.rot[1] = Math.max(-80, Math.min(80, st.current.rot[1] + (e.clientY - ly) * sp * 0.8))
    st.current.last = [e.clientX, e.clientY]
    drawRef.current()
  }
  const onMU = () => { st.current.drag = false; st.current.last = null; setIsDragging(false) }

  const onTS = (e) => {
    if (e.touches.length === 2) {
      pinchRef.current = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY)
      st.current.drag = false; st.current.last = null
    } else {
      st.current.drag = true; st.current.last = [e.touches[0].clientX, e.touches[0].clientY]
      pinchRef.current = null
    }
  }
  const onTM = (e) => {
    e.preventDefault()
    if (e.touches.length === 2 && pinchRef.current) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY)
      st.current.k = Math.max(0.4, Math.min(12, st.current.k * d / pinchRef.current))
      pinchRef.current = d
      drawRef.current()
    } else if (e.touches.length === 1 && st.current.last) {
      const [lx, ly] = st.current.last
      const sp = 0.3 / st.current.k
      st.current.rot[0] -= (e.touches[0].clientX - lx) * sp
      st.current.rot[1] = Math.max(-80, Math.min(80, st.current.rot[1] + (e.touches[0].clientY - ly) * sp * 0.8))
      st.current.last = [e.touches[0].clientX, e.touches[0].clientY]
      drawRef.current()
    }
  }
  const onTE = () => { st.current.drag = false; st.current.last = null; pinchRef.current = null }

  const toggleSpin = () => {
    if (spinning) { clearInterval(spinIdRef.current); setSpinning(false) }
    else {
      setSpinning(true)
      spinIdRef.current = setInterval(() => { st.current.rot[0] -= 0.25; drawRef.current() }, 30)
    }
  }
  const doZoom = (dir) => { st.current.k = Math.max(0.4, Math.min(12, st.current.k * (dir > 0 ? 1.35 : 1 / 1.35))); drawRef.current() }
  const doReset = () => { st.current.rot = [-GLOBE_SOM_LON, -GLOBE_SOM_LAT, 0]; st.current.k = 1; drawRef.current() }

  const allList = [{ name: 'Somalia', count: customers, main: true }, ...GLOBE_CLIST]

  return (
    <section className="rd-card">
      {/* Arc dash animation — CSS kept here so it applies to D3-rendered SVG children */}
      <style>{`@keyframes globeArcAnim { to { stroke-dashoffset: -18; } }`}</style>

      {/* ── Header ── */}
      <div className="rd-ch">
        <div>
          <h2 className="rd-ct">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            World map · Customers by country
          </h2>
          <p className="rd-cs">{customers} active customers · Somalia</p>
        </div>
        <div className="rd-seg" role="group" aria-label="Count by">
          <button type="button" className="rd-sg on">Customers</button>
          <button type="button" className="rd-sg">Active today</button>
        </div>
      </div>

      {/* ── Body: [map] [controls] [list] ── */}
      <div className="flex">

        {/* Map area */}
        <div
          ref={mapRef}
          className="relative m-3 mr-0 mt-4 min-w-0 flex-1 overflow-hidden rounded-xl"
          style={{
            background: 'radial-gradient(ellipse at 50% 42%, #f4f8ff 0%, #dbe7fb 100%)',
            cursor: isDragging ? 'grabbing' : 'grab',
            touchAction: 'none',
            userSelect: 'none',
          }}
          onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU}
          onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE}
        >
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            </div>
          )}

          <svg viewBox={`0 0 ${GLOBE_W} ${GLOBE_H}`} className="block w-full" aria-hidden="true">
            {/* D3 manages sphere · graticule · land inside this group */}
            <g ref={gRef} />
            {/* Arcs: stable React elements — only `d` changes on rotation so CSS animation is uninterrupted */}
            {arcPaths.map((arc, i) => (
              <path
                key={arc.name}
                d={arc.d}
                fill="none"
                stroke="#1262ff"
                strokeWidth="1.6"
                strokeOpacity="0.72"
                strokeDasharray="5 4"
                style={{ animation: 'globeArcAnim 1.2s linear infinite', animationDelay: `${-i * 0.19}s` }}
              />
            ))}
          </svg>

          {/* HTML marker labels — absolutely positioned over SVG */}
          {markers.map(m => (
            <div
              key={m.name}
              className="pointer-events-none absolute"
              style={{ left: `${(m.x / GLOBE_W) * 100}%`, top: `${(m.y / GLOBE_H) * 100}%` }}
            >
              {/* Dot */}
              <div style={{
                position: 'absolute',
                width: m.main ? 14 : 10, height: m.main ? 14 : 10,
                background: '#1262ff', border: '2.5px solid white', borderRadius: '50%',
                transform: 'translate(-50%, -50%)',
                boxShadow: `0 0 0 ${m.main ? 6 : 3}px rgba(18,98,255,${m.main ? 0.22 : 0.15})`,
              }} />
              {/* Pill label */}
              <div style={{ position: 'absolute', bottom: 'calc(50% + 9px)', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: 'white', border: '1px solid #e5e9f2', borderRadius: 999,
                  padding: '2px 3px 2px 8px', fontSize: 11, fontWeight: 600, color: '#1e293b',
                  boxShadow: '0 2px 10px rgba(15,23,42,.14)', lineHeight: '20px',
                }}>
                  {m.name}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    minWidth: 20, height: 20, padding: '0 5px', borderRadius: 999,
                    background: m.main ? '#1262ff' : '#0a1633',
                    color: 'white', fontSize: 10, fontWeight: 700,
                  }}>{m.count}</span>
                </div>
              </div>
            </div>
          ))}

          <p className="pointer-events-none absolute bottom-2 left-3 text-[10px] text-slate-400">Drag · Scroll to zoom</p>
        </div>

        {/* Controls column */}
        <div className="flex flex-col items-center justify-center gap-2 px-2 py-4">
          {[
            { svg: <path d="M12 5v14M5 12h14"/>,                                                                                   fn: () => doZoom(1),  title: 'Zoom in'  },
            { svg: <path d="M5 12h14"/>,                                                                                            fn: () => doZoom(-1), title: 'Zoom out' },
            { svg: <><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></>,                                                                     fn: toggleSpin,        title: spinning ? 'Stop spin' : 'Auto-spin', active: spinning },
            { svg: <><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>,                fn: doReset,           title: 'Reset view' },
          ].map((btn, i) => (
            <button
              key={i}
              onClick={btn.fn}
              title={btn.title}
              className={cn('rd-btn', btn.active && 'on')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-[16px] w-[16px]">{btn.svg}</svg>
            </button>
          ))}
        </div>

        {/* Country list */}
        <div
          className="mt-4 hidden w-[180px] shrink-0 overflow-y-auto border-l border-[#edf1f8] py-1 dark:border-[#2a3b55] sm:block"
          style={{ maxHeight: 360 }}
        >
          <p className="rd-sec-label px-3">Countries</p>
          {allList.map(c => (
            <div key={c.name} className="mx-1 flex h-[30px] items-center gap-2 rounded-lg px-2 text-[13px] hover:bg-[#f1f5ff] dark:hover:bg-[rgba(96,165,250,.1)]">
              <i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.main ? '#1262ff' : '#93b4ff' }} />
              <span className="min-w-0 flex-1 truncate">{c.name}</span>
              <b className="mono shrink-0 text-[13px] font-semibold">{c.count}</b>
              <span className="mono w-8 shrink-0 text-right text-[11px] text-[#9aa3b5]">{Math.round((c.count / Math.max(customers, 1)) * 100)}%</span>
            </div>
          ))}
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#edf1f8] px-3 pt-3 dark:border-[#2a3b55]">
            <div>
              <p className="rd-cs !mt-0">Total</p>
              <p className="mono mt-0.5 text-lg font-semibold">{customers}</p>
            </div>
            <div>
              <p className="rd-cs !mt-0">Rentals</p>
              <p className="mono mt-0.5 text-lg font-semibold">{rentals}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function StoreDashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [products, setProducts]   = useState([])
  const [customers, setCustomers] = useState([])
  const [rentals, setRentals]     = useState([])
  const [daily, setDaily]         = useState({ grandTotal: 0, byMethod: [] })
  const [summary, setSummary]     = useState([])
  const [methods, setMethods]     = useState([])
  const [analytics, setAnalytics] = useState({ topProducts: [], topCustomers: [], trend: [] })

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    Promise.all([
      listProducts(),
      listCustomers(),
      listRentals('active').catch(() => []),
      getDailyTotals(today).catch(() => ({ grandTotal: 0, byMethod: [] })),
      getSummary({}).catch(() => []),
      listPaymentMethods().catch(() => []),
      getAnalytics().catch(() => ({ topProducts: [], topCustomers: [], trend: [] })),
    ]).then(([p, c, r, d, s, m, a]) => {
      setProducts(p); setCustomers(c); setRentals(r)
      setDaily(d); setSummary(s); setMethods(m); setAnalytics(a)
    }).finally(() => setLoading(false))
  }, [])

  const balanceCards = useMemo(() => {
    const methodName = (id) => methods.find((m) => m._id === id)?.name || 'Unknown'
    return summary
      .map((s, i) => ({ ...s, name: methodName(s._id), tone: methodTones[i % methodTones.length] }))
      .sort((a, b) => b.total - a.total)
  }, [summary, methods])


  const statusData = useMemo(() => {
    const counts = products.reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc }, {})
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({ name: productStatusMeta[key]?.label || key, value, color: productStatusMeta[key]?.color || '#94a3b8' }))
  }, [products])

  const trendData = useMemo(() => analytics.trend.map((t) => ({ period: t.period, total: t.total })), [analytics.trend])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size={32} />
      </div>
    )
  }

  const available   = products.filter((p) => p.status === 'available').length
  const overdue     = rentals.filter((r) => r.status === 'overdue').length
  const allTimeTotal = summary.reduce((sum, s) => sum + s.total, 0)
  const txnCount    = summary.reduce((n, s) => n + s.count, 0)
  const dayStr      = new Date().toLocaleDateString([], { weekday: 'long' })
  const maxMethod   = Math.max(1, ...balanceCards.map((s) => s.total))
  const trendTotal  = trendData.reduce((n, t) => n + t.total, 0)
  const lastTwo     = trendData.slice(-2)
  const trendDelta  = lastTwo.length === 2 && lastTwo[0].total > 0
    ? Math.round(((lastTwo[1].total - lastTwo[0].total) / lastTwo[0].total) * 100)
    : null
  const maxProd     = Math.max(1, ...analytics.topProducts.map((p) => p.rentals || 0))
  const maxCust     = Math.max(1, ...analytics.topCustomers.map((c) => c.revenue || 0))
  const rentalCols  = { gridTemplateColumns: 'minmax(0,1fr) 90px minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) 96px' }

  return (
    <div className="rd-page">

      {/* ── Header bar ── */}
      <header className="rd-head">
        <span className="ic"><Home size={17} /></span>
        <nav aria-label="Breadcrumb">
          <span className="muted">Home</span>
          <span className="muted" aria-hidden="true">/</span>
          <h1>Dashboard</h1>
        </nav>
        <span className="rd-live"><i />Live</span>
        <span className="headline">{dayStr} · Live operational overview</span>
        <div className="tools">
          <span className="rd-chip hidden sm:inline-flex">
            <CalendarDays size={15} />
            {new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <Link to="/store/rentals" className="rd-chip primary">
            All Rentals
            <ChevronRight size={14} />
          </Link>
        </div>
      </header>

      {/* ── Number cards ── */}
      <div className="rd-kpis">
        <DashStatCard delay={0}   label="Products"         value={`${available}/${products.length}`} sub="Available"      subValue={available}            subTone="#16a34a" icon={Package}       tone={kpiTones.blue} />
        <DashStatCard delay={40}  label="Customers"        value={customers.length}                  sub="Registered"     subValue={customers.length}                       icon={Users}         tone={kpiTones.violet} />
        <DashStatCard delay={80}  label="Active Rentals"   value={rentals.length}                    sub="Overdue"        subValue={overdue}              subTone={overdue > 0 ? '#b42318' : '#16a34a'} icon={ClipboardList} tone={kpiTones.amber} />
        <DashStatCard delay={120} label="Collected Today"  value={formatMoney(daily.grandTotal)}     sub="Methods active" subValue={methods.length}       subTone="#1262ff" icon={Wallet}        tone={kpiTones.green} />
        <DashStatCard delay={160} label="All-time Balance" value={formatMoney(allTimeTotal)}         sub="Net collected"  subValue={`${txnCount} txn(s)`} subTone="#3a4a6b" icon={PiggyBank}     tone={kpiTones.rose} />
      </div>

      {/* ── Balance by method tiles ── */}
      {balanceCards.length > 0 && (
        <div>
          <p className="rd-sec-label">Balance by payment method</p>
          <div className="rd-tiles">
            {balanceCards.map((s, i) => (
              <div key={s._id} className="rd-tile" style={{ animationDelay: `${i * 30}ms` }}>
                <div className="rd-tile-top"><i style={{ background: s.tone.chart }} /><span className="truncate">{s.name}</span></div>
                <b title={formatMoney(s.total)}>{formatMoney(s.total)}</b>
                <small>{s.count} txn(s)</small>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Map + balance ── */}
      <div className="rd-grid2">
        <SomaliMapCard customers={customers.length} rentals={rentals.length} />

        <SectionCard
          icon={Wallet}
          title="Balance by payment method"
          subtitle={`All-time total collected: ${formatMoney(allTimeTotal)}`}
        >
          {balanceCards.length === 0 ? (
            <div className="rd-empty">No payment data yet</div>
          ) : (
            <div className="rd-bk">
              {balanceCards.map((s, i) => (
                <div key={s._id} className="rd-bk-row">
                  <span className="flex min-w-0 items-center gap-2">
                    <i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.tone.chart }} />
                    <span className="truncate">{s.name}</span>
                    <span className="mono text-[11.5px] text-[#9aa3b5]">{Math.round((s.total / Math.max(allTimeTotal, 1)) * 100)}%</span>
                  </span>
                  <b>{formatMoney(s.total)}</b>
                  <div className="tr">
                    <i style={{ width: `${Math.max(2, (s.total / maxMethod) * 100)}%`, background: s.tone.chart, animationDelay: `${i * 60}ms` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── Trend + top lists ── */}
      <div className={trendData.length > 0 ? 'rd-grid21' : 'rd-grid2'}>
        {trendData.length > 0 && (
          <SectionCard
            className="flex flex-col"
            icon={BarChart3}
            title="Revenue trend"
            subtitle={`Net collected per ${trendData.length > 6 ? 'week' : 'month'}`}
          >
            <div className="rd-totals">
              <div>
                <div className="rd-cs rd-key !mt-0"><i />Collected</div>
                <b className="rd-total">{formatMoney(trendTotal)}</b>{' '}
                {trendDelta !== null && (
                  <span className={cn('text-xs font-semibold', trendDelta >= 0 ? 'text-[#15803d]' : 'text-[#b42318]')}>
                    {trendDelta >= 0 ? '+' : ''}{trendDelta}%
                  </span>
                )}
              </div>
              <div>
                <div className="rd-cs rd-key !mt-0"><i style={{ background: '#bcd0fb' }} />Periods</div>
                <b className="rd-total">{trendData.length}</b>
              </div>
            </div>
            <div className="rd-chart mt-auto">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={trendData} margin={{ top: 12, right: 8, left: -8, bottom: 0 }} barCategoryGap="28%">
                  <CartesianGrid stroke="#edf1f8" vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#7a8499', fontFamily: 'Geist Mono' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#7a8499', fontFamily: 'Geist Mono' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(18,98,255,.06)' }} />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                    {trendData.map((_, i) => (
                      <Cell key={i} fill={i === trendData.length - 1 ? '#1262ff' : '#bcd0fb'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        )}

        <div className={cn('grid gap-5', trendData.length > 0 ? 'grid-cols-1' : 'col-span-full grid-cols-1 lg:grid-cols-2')}>
          <SectionCard icon={Trophy} title="Top products" subtitle="Most rented items">
            {analytics.topProducts.length === 0 ? (
              <div className="rd-empty">No rentals yet</div>
            ) : (
              <div className="rd-rank-list">
                {analytics.topProducts.map((p, i) => (
                  <div key={p._id || i} className={cn('rd-rank', i === 0 && 'first')} style={{ animationDelay: `${i * 40}ms` }}>
                    <span className="rd-rank-n">{String(i + 1).padStart(2, '0')}</span>
                    <div className="min-w-0">
                      <div className="rd-rank-top"><span>{p.name || 'Unknown'}</span><b>{p.rentals} rented</b></div>
                      <div className="rd-rank-sub"><span>Revenue</span><span className="mono">{formatMoney(p.revenue)}</span></div>
                      <div className="tr"><i style={{ width: `${Math.max(3, ((p.rentals || 0) / maxProd) * 100)}%` }} /></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard icon={Star} title="Top customers" subtitle="Highest revenue generated">
            {analytics.topCustomers.length === 0 ? (
              <div className="rd-empty">No customers yet</div>
            ) : (
              <div className="rd-rank-list">
                {analytics.topCustomers.map((c, i) => (
                  <div key={c._id || i} className={cn('rd-rank', i === 0 && 'first')} style={{ animationDelay: `${i * 40}ms` }}>
                    <span className="rd-rank-n">{String(i + 1).padStart(2, '0')}</span>
                    <div className="min-w-0">
                      <div className="rd-rank-top"><span>{c.fullName || 'Unknown'}</span><b>{formatMoney(c.revenue)}</b></div>
                      <div className="rd-rank-sub"><span>{c.rentals} rental(s)</span></div>
                      <div className="tr"><i style={{ width: `${Math.max(3, ((c.revenue || 0) / maxCust) * 100)}%` }} /></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      {/* ── Active rentals ── */}
      <SectionCard
        icon={ClipboardList}
        title="Active rentals"
        subtitle="Items currently out with customers"
        action={<Link to="/store/rentals" className="rd-lk">View all <ChevronRight size={13} /></Link>}
      >
        <div className="rd-list">
          <div className="rd-th" style={rentalCols}>
            <span>Rental</span><span>Items</span><span>Rent fee</span><span>Date out</span><span>Due</span><span className="rd-right">Status</span>
          </div>
          {rentals.length === 0 ? (
            <div className="rd-empty">No active rentals right now.</div>
          ) : rentals.slice(0, 8).map((row, i) => (
            <div key={row._id} className="rd-lr" style={{ ...rentalCols, animationDelay: `${i * 30}ms` }}>
              <span className="rd-name">
                <span className="rd-av"><ClipboardList size={13} /></span>
                <span className="mono rd-ellipsis text-xs">#{row._id.slice(-6)}</span>
              </span>
              <span>{row.items?.length || 0} item(s)</span>
              <span className="mono font-semibold">{formatMoney(row.totalRentFee)}</span>
              <span className="rd-date">{formatDate(row.dateOut)}</span>
              <span className="rd-date">{formatDate(row.expectedReturnDate)}</span>
              <span className="rd-right"><span className={cn('rd-pill', pillTone[row.status] || 'b')}>{row.status}</span></span>
            </div>
          ))}
        </div>
      </SectionCard>

    </div>
  )
}
