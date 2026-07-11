import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ProtectedRoute, RoleRoute, GuestRoute } from './routes/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/Login'
import SuperAdminDashboard from './pages/superadmin/Dashboard'
import Stores from './pages/superadmin/Stores'
import AdminNotifications from './pages/superadmin/Notifications'
import StoreDashboard from './pages/store/Dashboard'
import Products from './pages/store/Products'
import Customers from './pages/store/Customers'
import Rentals from './pages/store/Rentals'
import Payments from './pages/store/Payments'
import Reports from './pages/store/Reports'
import StaffUsers from './pages/store/Users'
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
                  <Route path="/admin/notifications" element={<AdminNotifications />} handle={{ title: 'Notifications' }} />
                </Route>
              </Route>

              <Route element={<RoleRoute roles={['STORE_OWNER', 'STORE_STAFF']} />}>
                <Route element={<AppLayout />}>
                  <Route path="/store" element={<StoreDashboard />} handle={{ title: 'Overview' }} />
                  <Route path="/store/products" element={<Products />} handle={{ title: 'Products' }} />
                  <Route path="/store/customers" element={<Customers />} handle={{ title: 'Customers' }} />
                  <Route path="/store/rentals" element={<Rentals />} handle={{ title: 'Rentals' }} />
                  <Route path="/store/payments" element={<Payments />} handle={{ title: 'Payments' }} />
                  <Route path="/store/reports" element={<Reports />} handle={{ title: 'Reports' }} />
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
