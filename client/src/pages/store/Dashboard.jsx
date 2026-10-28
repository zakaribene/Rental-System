import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, Users, ClipboardList, Wallet, Clock, PiggyBank, Trophy, Star, Home, ChevronRight } from 'lucide-react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts'
import * as d3 from 'd3'
import * as topojson from 'topojson-client'
import { listProducts } from '../../api/products'
import { listCustomers } from '../../api/customers'
import { listRentals } from '../../api/rentals'
import { getDailyTotals, getSummary, getAnalytics } from '../../api/reports'
import { listPaymentMethods } from '../../api/payments'
import Table from '../../components/ui/Table'
import { StatusBadge } from '../../components/ui/Badge'
import { Spinner, EmptyState } from '../../components/ui/Misc'
import { formatMoney, formatDate, cn } from '../../lib/utils'
import { useAuth } from '../../context/AuthContext'

const methodTones = [
  { bg: 'bg-blue-50 dark:bg-blue-500/15', text: 'text-blue-600 dark:text-blue-300', ring: 'ring-blue-100 dark:ring-blue-500/20', chart: '#3b82f6' },
  { bg: 'bg-emerald-50 dark:bg-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-300', ring: 'ring-emerald-100 dark:ring-emerald-500/20', chart: '#10b981' },
  { bg: 'bg-violet-50 dark:bg-violet-500/15', text: 'text-violet-600 dark:text-violet-300', ring: 'ring-violet-100 dark:ring-violet-500/20', chart: '#8b5cf6' },
  { bg: 'bg-amber-50 dark:bg-amber-500/15', text: 'text-amber-600 dark:text-amber-300', ring: 'ring-amber-100 dark:ring-amber-500/20', chart: '#f59e0b' },
  { bg: 'bg-rose-50 dark:bg-rose-500/15', text: 'text-rose-600 dark:text-rose-300', ring: 'ring-rose-100 dark:ring-rose-500/20', chart: '#f43f5e' },
]

const chartTooltipStyle = {
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  background: '#ffffff',
  color: '#1e293b',
  fontSize: 13,
  boxShadow: '0 4px 16px -4px rgba(15,23,42,0.15)',
}

function PieLegend({ payload }) {
  return (
    <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
      {(payload || []).map((entry) => (
        <div key={entry.value} className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          {entry.value}
        </div>
      ))}
    </div>
  )
}

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

function DashStatCard({ label, value, sub, subValue, subTone, icon: Icon, iconBg, iconColor }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800/60">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</p>
          <p className="mt-2 font-display text-[26px] font-bold leading-none text-slate-900 dark:text-white">{value}</p>
        </div>
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', iconBg)}>
          <Icon size={18} className={iconColor} />
        </div>
      </div>
      {sub && (
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400">{sub}</p>
          <p className={cn('text-xs font-bold', subTone ?? 'text-slate-700 dark:text-slate-200')}>{subValue}</p>
        </div>
      )}
    </div>
  )
}

function SectionCard({ title, subtitle, action, children, className }) {
  return (
    <div className={cn('overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/60', className)}>
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-700">
        <div>
          <p className="font-display text-sm font-bold text-slate-900 dark:text-white">{title}</p>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

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
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/60">
      {/* Arc dash animation — CSS kept here so it applies to D3-rendered SVG children */}
      <style>{`@keyframes globeArcAnim { to { stroke-dashoffset: -18; } }`}</style>

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-slate-700">
        <div>
          <p className="flex items-center gap-2 font-display text-sm font-semibold text-slate-900 dark:text-white">
            <svg className="h-[17px] w-[17px] shrink-0 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            World map · Customers by country
          </p>
          <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{customers} active customers · Somalia</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          <button className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm">Customers</button>
          <button className="rounded-md px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400">Active today</button>
        </div>
      </div>

      {/* ── Body: [map] [controls] [list] ── */}
      <div className="flex">

        {/* Map area */}
        <div
          ref={mapRef}
          className="relative m-3 mr-0 min-w-0 flex-1 overflow-hidden rounded-xl"
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
                stroke="#2563eb"
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
                background: '#2563eb', border: '2.5px solid white', borderRadius: '50%',
                transform: 'translate(-50%, -50%)',
                boxShadow: `0 0 0 ${m.main ? 6 : 3}px rgba(37,99,235,${m.main ? 0.22 : 0.15})`,
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
                    background: m.main ? '#2563eb' : '#7c3aed',
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
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg border shadow-sm transition-colors',
                btn.active
                  ? 'border-blue-400 bg-blue-50 text-blue-600 dark:border-blue-500 dark:bg-blue-500/20 dark:text-blue-400'
                  : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700',
              )}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-[16px] w-[16px]">{btn.svg}</svg>
            </button>
          ))}
        </div>

        {/* Country list */}
        <div
          className="hidden w-[172px] shrink-0 overflow-y-auto border-l border-slate-100 py-3 dark:border-slate-700 sm:block"
          style={{ maxHeight: 360 }}
        >
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Countries</p>
          {allList.map(c => (
            <div key={c.name} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/60">
              <div className={cn('h-2 w-2 shrink-0 rounded-full', c.main ? 'bg-blue-600' : 'bg-blue-400')} />
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700 dark:text-slate-300">{c.name}</span>
              <span className="shrink-0 text-xs font-bold text-slate-800 dark:text-slate-200">{c.count}</span>
              <span className="w-6 shrink-0 text-right text-[10px] text-slate-400">{Math.round((c.count / Math.max(customers, 1)) * 100)}%</span>
            </div>
          ))}
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 px-3 pt-3 dark:border-slate-700">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total</p>
              <p className="mt-0.5 font-display text-lg font-bold text-slate-900 dark:text-white">{customers}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Rentals</p>
              <p className="mt-0.5 font-display text-lg font-bold text-slate-900 dark:text-white">{rentals}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
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

  const chartData = useMemo(
    () => balanceCards.map((s) => ({ name: s.name, total: s.total, fill: s.tone.chart })),
    [balanceCards]
  )

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
  const dayStr = new Date().toLocaleDateString([], { weekday: 'long' })

  return (
    <div className="animate-fadeIn space-y-3">

      {/* ── Header banner ── */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/60">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/15">
              <Home size={16} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                <span>Home</span>
                <span>/</span>
                <span className="font-semibold text-slate-600 dark:text-slate-300">Dashboard</span>
                <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Live
                </span>
              </div>
              <h1 className="font-display text-lg font-bold leading-tight text-slate-900 dark:text-white">Dashboard</h1>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">{dayStr} · Live operational overview</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 sm:flex">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              {new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <Link
              to="/store/rentals"
              className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
            >
              All Rentals
              <ChevronRight size={12} />
            </Link>
          </div>
        </div>
      </div>

      {/* ── 5 Stat cards ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <DashStatCard
          label="Products"
          value={`${available}/${products.length}`}
          sub="Available"
          subValue={available}
          subTone="text-emerald-600 dark:text-emerald-400"
          icon={Package}
          iconBg="bg-blue-50 dark:bg-blue-500/15"
          iconColor="text-blue-600 dark:text-blue-400"
        />
        <DashStatCard
          label="Customers"
          value={customers.length}
          sub="Registered"
          subValue={customers.length}
          subTone="text-blue-600 dark:text-blue-400"
          icon={Users}
          iconBg="bg-violet-50 dark:bg-violet-500/15"
          iconColor="text-violet-600 dark:text-violet-400"
        />
        <DashStatCard
          label="Active Rentals"
          value={rentals.length}
          sub="Overdue"
          subValue={overdue}
          subTone={overdue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}
          icon={ClipboardList}
          iconBg="bg-amber-50 dark:bg-amber-500/15"
          iconColor="text-amber-600 dark:text-amber-400"
        />
        <DashStatCard
          label="Collected Today"
          value={formatMoney(daily.grandTotal)}
          sub="Methods active"
          subValue={methods.length}
          subTone="text-blue-600 dark:text-blue-400"
          icon={Wallet}
          iconBg="bg-emerald-50 dark:bg-emerald-500/15"
          iconColor="text-emerald-600 dark:text-emerald-400"
        />
        <DashStatCard
          label="All-time Balance"
          value={formatMoney(allTimeTotal)}
          sub="Net collected"
          subValue={summary.reduce((n, s) => n + s.count, 0) + ' txn(s)'}
          subTone="text-slate-600 dark:text-slate-300"
          icon={PiggyBank}
          iconBg="bg-rose-50 dark:bg-rose-500/15"
          iconColor="text-rose-600 dark:text-rose-400"
        />
      </div>

      {/* ── Balance by method cards ── */}
      {balanceCards.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Balance by payment method
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {balanceCards.map((s) => (
              <div
                key={s._id}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-800/60"
              >
                <div className={cn('mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg', s.tone.bg)}>
                  <Wallet size={13} className={s.tone.text} />
                </div>
                <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{s.name}</p>
                <p className="mt-0.5 font-display text-sm font-bold text-slate-900 dark:text-white">{formatMoney(s.total)}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">{s.count} txn(s)</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Map + Balance row (2 cards side by side) ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SomaliMapCard customers={customers.length} rentals={rentals.length} />

        <SectionCard
          title="Balance by payment method"
          subtitle={`All-time total collected: ${formatMoney(allTimeTotal)}`}
        >
          {chartData.length === 0 ? (
            <EmptyState icon={Wallet} title="No payment data yet" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  {chartData.map((entry, i) => (
                    <linearGradient key={i} id={`bg-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={entry.fill} stopOpacity={1} />
                      <stop offset="100%" stopColor={entry.fill} stopOpacity={0.5} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => formatMoney(v)} contentStyle={chartTooltipStyle} cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {chartData.map((_, i) => <Cell key={i} fill={`url(#bg-${i})`} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      {/* ── Trend + Top items ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        {trendData.length > 0 && (
          <SectionCard
            className="lg:col-span-3"
            title="Revenue trend"
            subtitle={`Net collected per ${trendData.length > 6 ? 'week' : 'month'}`}
          >
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => formatMoney(v)} contentStyle={chartTooltipStyle} />
                <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2.5} fill="url(#trend-fill)" />
              </AreaChart>
            </ResponsiveContainer>
          </SectionCard>
        )}

        <div className={cn('grid grid-cols-1 gap-5', trendData.length > 0 ? 'lg:col-span-2' : 'lg:col-span-5 lg:grid-cols-2')}>
          <SectionCard title="Top products" subtitle="Most rented items">
            {analytics.topProducts.length === 0 ? (
              <EmptyState icon={Trophy} title="No rentals yet" />
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-slate-700">
                {analytics.topProducts.map((p, i) => (
                  <div key={p._id || i} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                        i === 0 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      )}>{i + 1}</span>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{p.name || 'Unknown'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{p.rentals} rented</p>
                      <p className="text-[11px] text-slate-400">{formatMoney(p.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Top customers" subtitle="Highest revenue generated">
            {analytics.topCustomers.length === 0 ? (
              <EmptyState icon={Star} title="No customers yet" />
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-slate-700">
                {analytics.topCustomers.map((c, i) => (
                  <div key={c._id || i} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                        i === 0 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      )}>{i + 1}</span>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{c.fullName || 'Unknown'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{formatMoney(c.revenue)}</p>
                      <p className="text-[11px] text-slate-400">{c.rentals} rental(s)</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      {/* ── Active rentals table ── */}
      <SectionCard title="Active rentals" subtitle="Items currently out with customers">
        <div className="-mx-4 -mb-4">
          <Table
            columns={[
              { key: 'id',      header: 'Rental',   render: (row) => <span className="font-mono text-xs text-slate-400">#{row._id.slice(-6)}</span> },
              { key: 'items',   header: 'Items',    render: (row) => `${row.items?.length || 0} item(s)` },
              { key: 'fee',     header: 'Rent fee', render: (row) => formatMoney(row.totalRentFee) },
              { key: 'dateOut', header: 'Date out', render: (row) => formatDate(row.dateOut) },
              { key: 'due',     header: 'Due',      render: (row) => formatDate(row.expectedReturnDate) },
              { key: 'status',  header: 'Status',   render: (row) => <StatusBadge status={row.status} /> },
            ]}
            data={rentals.slice(0, 8)}
            emptyMessage="No active rentals right now."
          />
        </div>
      </SectionCard>

    </div>
  )
}
