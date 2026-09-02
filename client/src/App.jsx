import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ProtectedRoute, RoleRoute, GuestRoute } from './routes/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/Login'
import SuperAdminDashboard from './pages/superadmin/Dashboard'
import Stores from './pages/superadmin/Stores'
import Admins from './pages/superadmin/Admins'
import AdminNotifications from './pages/superadmin/Notifications'
import Subscriptions from './pages/superadmin/Subscriptions'
import AdminActivityLog from './pages/superadmin/ActivityLog'
import AdminSupport from './pages/superadmin/Support'
import StoreDashboard from './pages/store/Dashboard'
import Products from './pages/store/Products'
import Customers from './pages/store/Customers'
import Rentals from './pages/store/Rentals'
import Sales from './pages/store/Sales'
import Expenses from './pages/store/Expenses'
import Transfers from './pages/store/Transfers'
import Payments from './pages/store/Payments'
import Reports from './pages/store/Reports'
import ActivityLog from './pages/store/ActivityLog'
import StaffUsers from './pages/store/Users'
import Help from './pages/store/Help'
import { FullPageSpinner } from './components/ui/Misc'

function RootRedirect() {
  const { user, initializing } = useAuth()
  if (initializing) return <FullPageSpinner />
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={user.role === 'SUPER_ADMIN' ? '/admin' : '/store'} replace />
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<RootRedirect />} />

            <Route element={<GuestRoute />}>
              <Route path="/login" element={<Login />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route element={<RoleRoute roles={['SUPER_ADMIN']} />}>
                <Route element={<AppLayout />}>
                  <Route path="/admin" element={<SuperAdminDashboard />} handle={{ title: 'Overview' }} />
                  <Route path="/admin/stores" element={<Stores />} handle={{ title: 'Stores' }} />
                  <Route path="/admin/admins" element={<Admins />} handle={{ title: 'Admins' }} />
                  <Route path="/admin/notifications" element={<AdminNotifications />} handle={{ title: 'Notifications' }} />
                  <Route path="/admin/subscriptions" element={<Subscriptions />} handle={{ title: 'Subscriptions' }} />
                  <Route path="/admin/activity-log" element={<AdminActivityLog />} handle={{ title: 'Activity Log' }} />
                  <Route path="/admin/support" element={<AdminSupport />} handle={{ title: 'Support' }} />
                </Route>
              </Route>

              <Route element={<RoleRoute roles={['STORE_OWNER', 'STORE_STAFF']} />}>
                <Route element={<AppLayout />}>
                  <Route path="/store" element={<StoreDashboard />} handle={{ title: 'Overview' }} />
                  <Route path="/store/products" element={<Products />} handle={{ title: 'Products' }} />
                  <Route path="/store/customers" element={<Customers />} handle={{ title: 'Customers' }} />
                  <Route path="/store/rentals" element={<Rentals />} handle={{ title: 'Rentals' }} />
                  <Route path="/store/sales" element={<Sales />} handle={{ title: 'Sales' }} />
                  <Route path="/store/expenses" element={<Expenses />} handle={{ title: 'Expenses' }} />
                  <Route path="/store/transfers" element={<Transfers />} handle={{ title: 'Transfer Payments' }} />
                  <Route path="/store/payments" element={<Payments />} handle={{ title: 'Payments' }} />
                  <Route path="/store/reports" element={<Reports />} handle={{ title: 'Reports' }} />
                  <Route path="/store/activity-log" element={<ActivityLog />} handle={{ title: 'Activity Log' }} />
                  <Route path="/store/help" element={<Help />} handle={{ title: 'Help' }} />
                  <Route element={<RoleRoute roles={['STORE_OWNER']} />}>
                    <Route path="/store/users" element={<StaffUsers />} handle={{ title: 'Staff' }} />
                  </Route>
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
