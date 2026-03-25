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
import SuppliersPage from './pages/SuppliersPage'
import SupplierDetailPage from './pages/SupplierDetailPage'
import SupplierFormPage from './pages/SupplierFormPage'
import SalesPage from './pages/SalesPage'
import SaleDetailPage from './pages/SaleDetailPage'
import SaleFormPage from './pages/SaleFormPage'
import InvoicePage from './pages/InvoicePage'
import ReportsPage from './pages/ReportsPage'
import StatementPage from './pages/StatementPage'
import SettingsPage from './pages/SettingsPage'
import MonthEndPage from './pages/MonthEndPage'

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
        <Route path="customers/:id/statement" element={<StatementPage />} />
        <Route path="parts" element={<PartsPage />} />
        <Route path="parts/new" element={<PartFormPage />} />
        <Route path="parts/:id" element={<PartDetailPage />} />
        <Route path="parts/:id/edit" element={<PartFormPage />} />
        <Route path="suppliers" element={<SuppliersPage />} />
        <Route path="suppliers/new" element={<SupplierFormPage />} />
        <Route path="suppliers/:id" element={<SupplierDetailPage />} />
        <Route path="suppliers/:id/edit" element={<SupplierFormPage />} />
        <Route path="work-orders" element={<WorkOrdersPage />} />
        <Route path="work-orders/new" element={<WorkOrderFormPage />} />
        <Route path="work-orders/:id" element={<WorkOrderDetailPage />} />
        <Route path="work-orders/:id/edit" element={<WorkOrderFormPage />} />
        <Route path="work-orders/:id/invoice" element={<InvoicePage />} />
        <Route path="sales" element={<SalesPage />} />
        <Route path="sales/new" element={<SaleFormPage />} />
        <Route path="sales/:id" element={<SaleDetailPage />} />
        <Route path="sales/:id/edit" element={<SaleFormPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="month-end" element={<MonthEndPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}
