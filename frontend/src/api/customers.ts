import client from './client'
import type { Customer, ARTransaction, PaginatedResponse, PaginationParams, Vehicle } from '@/types'

export async function getCustomers(
  params: Partial<PaginationParams>,
): Promise<PaginatedResponse<Customer>> {
  const { data } = await client.get<PaginatedResponse<Customer>>('/api/customers', { params })
  return data
}

export async function getCustomer(id: string): Promise<Customer> {
  const { data } = await client.get<Customer>(`/api/customers/${id}`)
  return data
}

export async function createCustomer(customerData: Partial<Customer>): Promise<Customer> {
  const { data } = await client.post<Customer>('/api/customers', customerData)
  return data
}

export async function updateCustomer(id: string, customerData: Partial<Customer>): Promise<Customer> {
  const { data } = await client.put<Customer>(`/api/customers/${id}`, customerData)
  return data
}

export async function deleteCustomer(id: string): Promise<void> {
  await client.delete(`/api/customers/${id}`)
}

export async function getCustomerVehicles(customerId: string): Promise<Vehicle[]> {
  const { data } = await client.get<Vehicle[]>(`/api/customers/${customerId}/vehicles`)
  return data
}

export async function getCustomerARTransactions(customerId: string): Promise<ARTransaction[]> {
  const { data } = await client.get<ARTransaction[]>(`/api/customers/${customerId}/ar-transactions`)
  return data
}

export async function createARTransaction(
  customerId: string,
  txn: { date: string; description: string; crDr: string; amount: number },
): Promise<ARTransaction> {
  const { data } = await client.post<ARTransaction>(`/api/customers/${customerId}/ar-transactions`, txn)
  return data
}

export interface ARStatement {
  shopName: string
  shopAddress: string
  shopCity: string
  shopProvince: string
  shopPostalCode: string
  shopPhone: string
  customerName: string
  customerPhone: string
  customerStreet: string
  customerCity: string
  customerProvince: string
  customerPostalCode: string
  statementDate: string
  previousBalance: number
  transactions: ARTransaction[]
  arBalance: number
  arCurrent: number
  ar30: number
  ar60: number
  ar90: number
}

export async function getCustomerStatement(customerId: string): Promise<ARStatement> {
  const { data } = await client.get<ARStatement>(`/api/customers/${customerId}/statement`)
  return data
}
