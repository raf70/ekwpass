import client from './client'

export interface WorkOrderLine {
  id: string
  workOrderId: string
  lineType: string
  sequence: number
  partCode: string
  description: string
  qty: number
  price: number
  cost: number
  isTaxable: boolean
  createdAt: string
  updatedAt: string
}

export async function getWorkOrderLines(workOrderId: string): Promise<WorkOrderLine[]> {
  const { data } = await client.get<WorkOrderLine[]>(`/api/work-orders/${workOrderId}/lines`)
  return data
}

export async function createWorkOrderLine(
  workOrderId: string,
  line: Partial<WorkOrderLine>,
): Promise<WorkOrderLine> {
  const { data } = await client.post<WorkOrderLine>(`/api/work-orders/${workOrderId}/lines`, line)
  return data
}

export async function deleteWorkOrderLine(workOrderId: string, lineId: string): Promise<void> {
  await client.delete(`/api/work-orders/${workOrderId}/lines/${lineId}`)
}
