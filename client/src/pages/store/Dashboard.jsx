import { useEffect, useState } from 'react'
import { Package, Users, ClipboardList, Wallet } from 'lucide-react'
import { listProducts } from '../../api/products'
import { listCustomers } from '../../api/customers'
import { listRentals } from '../../api/rentals'
import { getDailyTotals } from '../../api/reports'
import StatCard from '../../components/ui/StatCard'
import Card, { CardHeader } from '../../components/ui/Card'
import Table from '../../components/ui/Table'
import { StatusBadge } from '../../components/ui/Badge'
import { PageHeader, Spinner } from '../../components/ui/Misc'
import { formatMoney, formatDate } from '../../lib/utils'
import { useAuth } from '../../context/AuthContext'

export default function StoreDashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [rentals, setRentals] = useState([])
  const [daily, setDaily] = useState({ grandTotal: 0, byMethod: [] })

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    Promise.all([
      listProducts(),
      listCustomers(),
      listRentals('active'),
      getDailyTotals(today).catch(() => ({ grandTotal: 0, byMethod: [] })),
    ])
      .then(([p, c, r, d]) => {
        setProducts(p)
        setCustomers(c)
        setRentals(r)
        setDaily(d)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size={32} />
      </div>
    )
  }

  const available = products.filter((p) => p.status === 'available').length

  return (
    <div className="animate-fadeIn">
      <PageHeader title={`Welcome back, ${user?.name?.split(' ')[0] || ''}`} subtitle="Here's what's happening in your store today." />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Products available" value={`${available}/${products.length}`} icon={Package} tone="primary" />
        <StatCard label="Customers" value={customers.length} icon={Users} tone="info" />
        <StatCard label="Active rentals" value={rentals.length} icon={ClipboardList} tone="warning" />
        <StatCard label="Collected today" value={formatMoney(daily.grandTotal)} icon={Wallet} tone="success" />
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
