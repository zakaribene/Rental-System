import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

const titles = {
  '/admin': 'Overview',
  '/admin/stores': 'Stores',
  '/admin/notifications': 'Notifications',
  '/store': 'Overview',
  '/store/products': 'Products',
  '/store/customers': 'Customers',
  '/store/rentals': 'Rentals',
  '/store/payments': 'Payments',
  '/store/reports': 'Reports',
  '/store/users': 'Staff',
}

export default function AppLayout() {
  const { pathname } = useLocation()
  const title = titles[pathname] || 'Dashboard'
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  return (
    <div className="min-h-screen bg-ink-50 dark:bg-ink-950">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="md:pl-64">
        <Topbar title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
