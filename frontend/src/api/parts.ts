import client from './client'
import type { Part, PaginatedResponse, PaginationParams } from '@/types'

export async function getParts(
  params: Partial<PaginationParams>,
): Promise<PaginatedResponse<Part>> {
  const { data } = await client.get<PaginatedResponse<Part>>('/api/parts', { params })
  return data
}

export async function getPart(id: string): Promise<Part> {
  const { data } = await client.get<Part>(`/api/parts/${id}`)
  return data
}

export async function createPart(part: Partial<Part>): Promise<Part> {
  const { data } = await client.post<Part>('/api/parts', part)
  return data
}

export async function updatePart(id: string, part: Partial<Part>): Promise<Part> {
  const { data } = await client.put<Part>(`/api/parts/${id}`, part)
  return data
}

export async function deletePart(id: string): Promise<void> {
  await client.delete(`/api/parts/${id}`)
}

export async function searchParts(params: { code?: string; description?: string; limit?: number }): Promise<Part[]> {
  const { data } = await client.get<Part[]>('/api/parts/search', { params })
  return data
}
