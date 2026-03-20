import client from './client'
import type { Customer, PaginatedResponse, PaginationParams, Vehicle } from '@/types'

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
