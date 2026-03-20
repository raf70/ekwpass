import client from './client'
import type { Vehicle } from '@/types'

export async function createVehicle(vehicle: Partial<Vehicle>): Promise<Vehicle> {
  const { data } = await client.post<Vehicle>('/api/vehicles', vehicle)
  return data
}

export async function deleteVehicle(id: string): Promise<void> {
  await client.delete(`/api/vehicles/${id}`)
}
