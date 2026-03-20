import client from './client'
import type { WorkOrder, PaginatedResponse, PaginationParams } from '@/types'

export async function getWorkOrders(
  params: Partial<PaginationParams> & { status?: string },
): Promise<PaginatedResponse<WorkOrder>> {
  const { data } = await client.get<PaginatedResponse<WorkOrder>>('/api/work-orders', { params })
  return data
}

export async function getWorkOrder(id: string): Promise<WorkOrder> {
  const { data } = await client.get<WorkOrder>(`/api/work-orders/${id}`)
  return data
}

export async function createWorkOrder(wo: Partial<WorkOrder>): Promise<WorkOrder> {
  const { data } = await client.post<WorkOrder>('/api/work-orders', wo)
  return data
}

export async function updateWorkOrder(id: string, wo: Partial<WorkOrder>): Promise<WorkOrder> {
  const { data } = await client.put<WorkOrder>(`/api/work-orders/${id}`, wo)
  return data
}
