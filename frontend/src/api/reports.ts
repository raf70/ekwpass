import client from './client'

export interface CustomerReportRow {
  name: string
  phone: string
  city: string
  arCurrent: number
  ar30: number
  ar60: number
  ar90: number
  arBalance: number
  ytdSales: number
  lastServiceDate: string | null
}

export interface WorkOrderReportRow {
  invoiceNumber: string
  date: string
  status: string
  customerName: string
  vehicleDesc: string
  vehiclePlate: string
  jobsTotal: number
  partsTotal: number
  totalTax: number
  grandTotal: number
}

export interface SummaryReport {
  totalOrders: number
  openOrders: number
  closedOrders: number
  voidedOrders: number
  jobsTaxable: number
  jobsNontaxable: number
  partsTaxable: number
  partsNontaxable: number
  shopSupplies: number
  totalPst: number
  totalGst: number
  totalTax: number
  grandTotal: number
}

export async function getCustomerReport(arOnly: boolean): Promise<CustomerReportRow[]> {
  const { data } = await client.get<CustomerReportRow[]>('/api/reports/customers', {
    params: { arOnly: arOnly ? 'true' : undefined },
  })
  return data
}

export async function getWorkOrderReport(params: {
  status?: string
  from?: string
  to?: string
}): Promise<WorkOrderReportRow[]> {
  const { data } = await client.get<WorkOrderReportRow[]>('/api/reports/work-orders', { params })
  return data
}

export async function getSummaryReport(params: {
  from?: string
  to?: string
}): Promise<SummaryReport> {
  const { data } = await client.get<SummaryReport>('/api/reports/summary', { params })
  return data
}

export interface ARAgingRow {
  customerId: string
  customerName: string
  phone: string
  city: string
  current: number
  days30: number
  days60: number
  days90: number
  total: number
}

export interface ARAgingSummary {
  rows: ARAgingRow[]
  totalCurrent: number
  total30: number
  total60: number
  total90: number
  grandTotal: number
  customerCount: number
}

export async function getARAgingReport(): Promise<ARAgingSummary> {
  const { data } = await client.get<ARAgingSummary>('/api/reports/ar-aging')
  return data
}
