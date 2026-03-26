import client from './client'

export interface LookupCode {
  id: string
  shopId: string
  tableId: string
  keyValue: number
  description: string
  department: number
  hours: number
  rate: number
  sales: number
  cost: number
  amount: number
  flag: string
  createdAt: string
  updatedAt: string
}

export interface LookupCategory {
  tableId: string
  count: number
}

export async function getLookupCategories(): Promise<LookupCategory[]> {
  const { data } = await client.get<LookupCategory[]>('/api/lookup-codes/categories')
  return data
}

export async function getLookupCodes(tableId: string): Promise<LookupCode[]> {
  const { data } = await client.get<LookupCode[]>('/api/lookup-codes', {
    params: { tableId },
  })
  return data
}

export async function createLookupCode(code: Partial<LookupCode>): Promise<LookupCode> {
  const { data } = await client.post<LookupCode>('/api/lookup-codes', code)
  return data
}

export async function updateLookupCode(id: string, code: Partial<LookupCode>): Promise<LookupCode> {
  const { data } = await client.put<LookupCode>(`/api/lookup-codes/${id}`, code)
  return data
}

export async function deleteLookupCode(id: string): Promise<void> {
  await client.delete(`/api/lookup-codes/${id}`)
}
