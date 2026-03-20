import client from './client'
import type { AuthStatus, LoginResponse, RegisterRequest, User } from '@/types'

export async function getAuthStatus(): Promise<AuthStatus> {
  const { data } = await client.get<AuthStatus>('/api/auth/status')
  return data
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await client.post<LoginResponse>('/api/auth/login', { email, password })
  return data
}

export async function setup(req: RegisterRequest): Promise<LoginResponse> {
  const { data } = await client.post<LoginResponse>('/api/auth/setup', req)
  return data
}

export async function getCurrentUser(): Promise<User> {
  const { data } = await client.get<User>('/api/auth/me')
  return data
}
