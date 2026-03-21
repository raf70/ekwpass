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
}

export async function getLookupCodes(tableId: string): Promise<LookupCode[]> {
  const { data } = await client.get<LookupCode[]>('/lookup-codes', {
    params: { tableId },
  })
  return data
}
