import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, Shield, User as UserIcon, Wrench, Save, X, KeyRound } from 'lucide-react'
import { getUsers, createUser, updateUser, resetUserPassword, type User } from '@/api/users'
import { useAuth } from '@/hooks/useAuth'

const ROLES = [
  { value: 'admin', label: 'Admin', icon: Shield, color: 'text-purple-600 bg-purple-50' },
  { value: 'technician', label: 'Technician', icon: Wrench, color: 'text-blue-600 bg-blue-50' },
  { value: 'front_desk', label: 'Front Desk', icon: UserIcon, color: 'text-emerald-600 bg-emerald-50' },
]

function roleBadge(role: string) {
  const r = ROLES.find((x) => x.value === role) ?? ROLES[2]
  const Icon = r.icon
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${r.color}`}>
      <Icon className="h-3 w-3" />
      {r.label}
    </span>
  )
}

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'
const labelCls = 'mb-1 block text-xs font-medium text-slate-500'

export default function UsersPage() {
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuth()
  const [showCreate, setShowCreate] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editData, setEditData] = useState({ name: '', email: '', role: 'front_desk', isActive: true })
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'front_desk' })
  const [createError, setCreateError] = useState('')
  const [editError, setEditError] = useState('')
  const [resetId, setResetId] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [resetMsg, setResetMsg] = useState('')

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  })

  const createMut = useMutation({
    mutationFn: () => createUser(newUser),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setShowCreate(false)
      setNewUser({ name: '', email: '', password: '', role: 'front_desk' })
      setCreateError('')
    },
    onError: (err: any) => {
      setCreateError(err.response?.data?.error || 'Failed to create user')
    },
  })

  const updateMut = useMutation({
    mutationFn: () => updateUser(editId!, editData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setEditId(null)
      setEditError('')
    },
    onError: (err: any) => {
      setEditError(err.response?.data?.error || 'Failed to update user')
    },
  })

  const resetMut = useMutation({
    mutationFn: () => resetUserPassword(resetId!, newPassword),
    onSuccess: () => {
      setResetMsg('Password reset successfully')
      setNewPassword('')
      setTimeout(() => { setResetId(null); setResetMsg('') }, 2000)
    },
    onError: (err: any) => {
      setResetMsg(err.response?.data?.error || 'Failed to reset password')
    },
  })

  function startEdit(u: User) {
    setEditId(u.id)
    setEditData({ name: u.name, email: u.email, role: u.role, isActive: u.isActive })
    setEditError('')
    setResetId(null)
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage user accounts, roles, and access
          </p>
        </div>
        {!showCreate && (
          <button
            onClick={() => { setShowCreate(true); setEditId(null) }}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add User
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <section className="mb-6 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">New User</h2>
          {createError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {createError}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Name</label>
              <input
                type="text"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                className={inputCls}
                placeholder="Full name"
              />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className={inputCls}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className={labelCls}>Password</label>
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className={inputCls}
                placeholder="Min 6 characters"
              />
            </div>
            <div>
              <label className={labelCls}>Role</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className={inputCls}
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end gap-3">
            <button
              onClick={() => { setShowCreate(false); setCreateError('') }}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={() => createMut.mutate()}
              disabled={!newUser.name || !newUser.email || !newUser.password || createMut.isPending}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create User
            </button>
          </div>
        </section>
      )}

      {/* User list */}
      <section className="rounded-xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="px-6 py-3 font-medium text-slate-500">Name</th>
                <th className="px-6 py-3 font-medium text-slate-500">Email</th>
                <th className="px-6 py-3 font-medium text-slate-500">Role</th>
                <th className="px-6 py-3 font-medium text-slate-500">Status</th>
                <th className="w-40 px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((u) => (
                <tr key={u.id} className="group border-b last:border-0 hover:bg-slate-50">
                  {editId === u.id ? (
                    <>
                      <td className="px-6 py-2">
                        <input
                          type="text"
                          value={editData.name}
                          onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                          className={inputCls}
                        />
                      </td>
                      <td className="px-6 py-2">
                        <input
                          type="email"
                          value={editData.email}
                          onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                          className={inputCls}
                        />
                      </td>
                      <td className="px-6 py-2">
                        <select
                          value={editData.role}
                          onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                          className={inputCls}
                        >
                          {ROLES.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={editData.isActive}
                            onChange={(e) => setEditData({ ...editData, isActive: e.target.checked })}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600"
                            disabled={u.id === currentUser?.id}
                          />
                          <span className="text-sm">{editData.isActive ? 'Active' : 'Inactive'}</span>
                        </label>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-1">
                          {editError && <p className="text-xs text-red-600">{editError}</p>}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => updateMut.mutate()}
                              disabled={updateMut.isPending}
                              className="rounded p-1 text-green-600 hover:bg-green-100"
                              title="Save"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => { setEditId(null); setEditError('') }}
                              className="rounded p-1 text-slate-400 hover:bg-slate-100"
                              title="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-3 font-medium text-slate-900">
                        {u.name}
                        {u.id === currentUser?.id && (
                          <span className="ml-2 text-xs text-slate-400">(you)</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-slate-600">{u.email}</td>
                      <td className="px-6 py-3">{roleBadge(u.role)}</td>
                      <td className="px-6 py-3">
                        {u.isActive ? (
                          <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">Active</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">Inactive</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => startEdit(u)}
                            className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => { setResetId(u.id); setNewPassword(''); setResetMsg(''); setEditId(null) }}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            title="Reset password"
                          >
                            <KeyRound className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {(users ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-sm text-slate-400">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Reset password dialog */}
      {resetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Reset Password</h3>
            <p className="mb-3 text-sm text-slate-500">
              Set a new password for <strong>{users?.find((u) => u.id === resetId)?.name}</strong>
            </p>
            {resetMsg && (
              <div className={`mb-3 rounded-lg px-3 py-2 text-sm ${resetMsg.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {resetMsg}
              </div>
            )}
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (min 6 characters)"
              className={inputCls}
            />
            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                onClick={() => { setResetId(null); setResetMsg('') }}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
              <button
                onClick={() => resetMut.mutate()}
                disabled={newPassword.length < 6 || resetMut.isPending}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {resetMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
