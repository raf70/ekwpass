import client from './client'
import type { Supplier, Part, APTransaction, PaginatedResponse, PaginationParams } from '@/types'

export async function getSuppliers(
  params: Partial<PaginationParams>,
): Promise<PaginatedResponse<Supplier>> {
  const { data } = await client.get<PaginatedResponse<Supplier>>('/api/suppliers', { params })
  return data
}

export async function getSupplier(id: string): Promise<Supplier> {
  const { data } = await client.get<Supplier>(`/api/suppliers/${id}`)
  return data
}

export async function createSupplier(supplier: Partial<Supplier>): Promise<Supplier> {
  const { data } = await client.post<Supplier>('/api/suppliers', supplier)
  return data
}

export async function updateSupplier(id: string, supplier: Partial<Supplier>): Promise<Supplier> {
  const { data } = await client.put<Supplier>(`/api/suppliers/${id}`, supplier)
  return data
}

export async function deleteSupplier(id: string): Promise<void> {
  await client.delete(`/api/suppliers/${id}`)
}

export async function getSupplierParts(supplierId: string): Promise<Part[]> {
  const { data } = await client.get<Part[]>(`/api/suppliers/${supplierId}/parts`)
  return data
}

export async function getSupplierAPTransactions(supplierId: string): Promise<APTransaction[]> {
  const { data } = await client.get<APTransaction[]>(`/api/suppliers/${supplierId}/ap-transactions`)
  return data
}
