import client from './client'

export interface MonthEndPreview {
  systemMonth: number
  monthName: string
  arInterestRate: number
  arDelayProcessing: boolean
  totalARCustomers: number
  overdueCustomers: number
}

export interface MonthEndResult {
  agingProcessed: number
  interestCharged: number
  statementsGenerated: number
  newMonth: number
  newMonthName: string
}

export async function getMonthEndPreview(): Promise<MonthEndPreview> {
  const { data } = await client.get<MonthEndPreview>('/api/month-end/preview')
  return data
}

export async function runMonthEnd(): Promise<MonthEndResult> {
  const { data } = await client.post<MonthEndResult>('/api/month-end/process')
  return data
}
