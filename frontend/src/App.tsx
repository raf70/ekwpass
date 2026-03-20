import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { Loader2 } from 'lucide-react'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './pages/LoginPage'
import SetupPage from './pages/SetupPage'
import DashboardPage from './pages/DashboardPage'
import CustomersPage from './pages/CustomersPage'
import CustomerDetailPage from './pages/CustomerDetailPage'
import CustomerFormPage from './pages/CustomerFormPage'
import WorkOrdersPage from './pages/WorkOrdersPage'
import WorkOrderDetailPage from './pages/WorkOrderDetailPage'
import WorkOrderFormPage from './pages/WorkOrderFormPage'
import PartsPage from './pages/PartsPage'
import PartDetailPage from './pages/PartDetailPage'
import PartFormPage from './pages/PartFormPage'
import ReportsPage from './pages/ReportsPage'
import PlaceholderPage from './pages/PlaceholderPage'

function ProtectedRoute() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <AppLayout />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route element={<ProtectedRoute />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="customers/new" element={<CustomerFormPage />} />
        <Route path="customers/:id" element={<CustomerDetailPage />} />
        <Route path="customers/:id/edit" element={<CustomerFormPage />} />
        <Route path="parts" element={<PartsPage />} />
        <Route path="parts/new" element={<PartFormPage />} />
        <Route path="parts/:id" element={<PartDetailPage />} />
        <Route path="parts/:id/edit" element={<PartFormPage />} />
        <Route path="suppliers" element={<PlaceholderPage title="Suppliers" />} />
        <Route path="work-orders" element={<WorkOrdersPage />} />
        <Route path="work-orders/new" element={<WorkOrderFormPage />} />
        <Route path="work-orders/:id" element={<WorkOrderDetailPage />} />
        <Route path="work-orders/:id/edit" element={<WorkOrderFormPage />} />
        <Route path="sales" element={<PlaceholderPage title="Sales" />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<PlaceholderPage title="Settings" />} />
      </Route>
    </Routes>
  )
}
