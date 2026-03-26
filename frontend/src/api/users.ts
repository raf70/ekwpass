import client from './client'

export interface User {
  id: string
  shopId: string
  email: string
  name: string
  role: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateUserRequest {
  name: string
  email: string
  password: string
  role: string
}

export interface UpdateUserRequest {
  name: string
  email: string
  role: string
  isActive: boolean
}

export async function getUsers(): Promise<User[]> {
  const { data } = await client.get<User[]>('/api/users')
  return data
}

export async function getUser(id: string): Promise<User> {
  const { data } = await client.get<User>(`/api/users/${id}`)
  return data
}

export async function createUser(req: CreateUserRequest): Promise<User> {
  const { data } = await client.post<User>('/api/users', req)
  return data
}

export async function updateUser(id: string, req: UpdateUserRequest): Promise<User> {
  const { data } = await client.put<User>(`/api/users/${id}`, req)
  return data
}

export async function resetUserPassword(id: string, password: string): Promise<void> {
  await client.post(`/api/users/${id}/reset-password`, { password })
}
