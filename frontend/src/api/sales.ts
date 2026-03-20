import client from './client'
import type { Sale, PaginatedResponse, PaginationParams } from '@/types'

export async function getSales(
  params: Partial<PaginationParams> & { status?: string },
): Promise<PaginatedResponse<Sale>> {
  const { data } = await client.get<PaginatedResponse<Sale>>('/api/sales', { params })
  return data
}

export async function getSale(id: string): Promise<Sale> {
  const { data } = await client.get<Sale>(`/api/sales/${id}`)
  return data
}

export async function createSale(sale: Partial<Sale>): Promise<Sale> {
  const { data } = await client.post<Sale>('/api/sales', sale)
  return data
}

export async function updateSale(id: string, sale: Partial<Sale>): Promise<Sale> {
  const { data } = await client.put<Sale>(`/api/sales/${id}`, sale)
  return data
}

export async function deleteSale(id: string): Promise<void> {
  await client.delete(`/api/sales/${id}`)
}
