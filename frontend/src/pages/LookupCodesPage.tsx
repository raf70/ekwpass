import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, Trash2, Save, X } from 'lucide-react'
import {
  getLookupCategories, getLookupCodes, createLookupCode,
  updateLookupCode, deleteLookupCode, type LookupCode,
} from '@/api/lookupCodes'

const CATEGORY_LABELS: Record<string, string> = {
  C: 'Expense Categories',
  D: 'Departments',
  E: 'Service Categories',
  F: 'Follow-Up Codes',
  J: 'Job Descriptions',
  K: 'Job Continuations',
  M: 'Payment Types',
  P: 'Part Categories',
  S: 'Sale Types',
  T: 'Technicians',
}

const inputClass =
  'w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20'

export default function LookupCodesPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<LookupCode>>({})
  const [showAdd, setShowAdd] = useState(false)
  const [newCode, setNewCode] = useState({ keyValue: 0, description: '' })

  const { data: categories, isLoading: loadingCats } = useQuery({
    queryKey: ['lookup-categories'],
    queryFn: getLookupCategories,
  })

  const tab = activeTab || (categories?.[0]?.tableId ?? '')

  const { data: codes, isLoading: loadingCodes } = useQuery({
    queryKey: ['lookup-codes', tab],
    queryFn: () => getLookupCodes(tab),
    enabled: !!tab,
  })

  const createMut = useMutation({
    mutationFn: () => createLookupCode({ tableId: tab, ...newCode }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lookup-codes', tab] })
      queryClient.invalidateQueries({ queryKey: ['lookup-categories'] })
      setShowAdd(false)
      setNewCode({ keyValue: 0, description: '' })
    },
  })

  const updateMut = useMutation({
    mutationFn: () => updateLookupCode(editId!, editData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lookup-codes', tab] })
      setEditId(null)
      setEditData({})
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Failed to update lookup code.')
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteLookupCode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lookup-codes', tab] })
      queryClient.invalidateQueries({ queryKey: ['lookup-categories'] })
    },
  })

  function startEdit(code: LookupCode) {
    setEditId(code.id)
    setEditData({ description: code.description, department: code.department, rate: code.rate, hours: code.hours, updatedAt: code.updatedAt })
  }

  if (loadingCats) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lookup Codes</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage code tables used across the application (departments, payment types, job descriptions, etc.)
          </p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="mb-4 flex flex-wrap gap-1 rounded-lg border bg-slate-50 p-1">
        {(categories ?? []).map((cat) => (
          <button
            key={cat.tableId}
            onClick={() => { setActiveTab(cat.tableId); setEditId(null); setShowAdd(false) }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === cat.tableId
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {CATEGORY_LABELS[cat.tableId] || cat.tableId}
            <span className="ml-1.5 text-xs text-slate-400">({cat.count})</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <section className="rounded-xl border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            {CATEGORY_LABELS[tab] || tab}
          </h2>
          {!showAdd && (
            <button
              onClick={() => { setShowAdd(true); setEditId(null) }}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Add Code
            </button>
          )}
        </div>

        {showAdd && (
          <div className="border-b px-6 py-4">
            <div className="flex items-end gap-3">
              <div className="w-24">
                <label className="mb-1 block text-xs font-medium text-slate-500">Key</label>
                <input
                  type="number"
                  value={newCode.keyValue}
                  onChange={(e) => setNewCode({ ...newCode, keyValue: parseInt(e.target.value) || 0 })}
                  className={inputClass}
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-slate-500">Description</label>
                <input
                  type="text"
                  value={newCode.description}
                  onChange={(e) => setNewCode({ ...newCode, description: e.target.value })}
                  className={inputClass}
                  placeholder="Description"
                />
              </div>
              <button
                onClick={() => createMut.mutate()}
                disabled={!newCode.description.trim() || createMut.isPending}
                className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add
              </button>
              <button
                onClick={() => { setShowAdd(false); setNewCode({ keyValue: 0, description: '' }) }}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
            {createMut.isError && <p className="mt-2 text-sm text-red-600">Failed to create. Key may already exist.</p>}
          </div>
        )}

        {loadingCodes ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : (codes ?? []).length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">No codes in this category</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="w-20 px-6 py-3 font-medium text-slate-500">Key</th>
                  <th className="px-6 py-3 font-medium text-slate-500">Description</th>
                  <th className="w-24 px-6 py-3 text-right font-medium text-slate-500">Dept</th>
                  <th className="w-24 px-6 py-3 text-right font-medium text-slate-500">Rate</th>
                  <th className="w-24 px-6 py-3 text-right font-medium text-slate-500">Hours</th>
                  <th className="w-20 px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {(codes ?? []).map((code) => (
                  <tr key={code.id} className="group border-b last:border-0 hover:bg-slate-50">
                    <td className="px-6 py-3 font-mono text-xs text-slate-600">{code.keyValue}</td>
                    {editId === code.id ? (
                      <>
                        <td className="px-6 py-2">
                          <input
                            type="text"
                            value={editData.description ?? ''}
                            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                            className={inputClass}
                          />
                        </td>
                        <td className="px-6 py-2">
                          <input
                            type="number"
                            value={editData.department ?? 0}
                            onChange={(e) => setEditData({ ...editData, department: parseInt(e.target.value) || 0 })}
                            className={inputClass + ' text-right'}
                          />
                        </td>
                        <td className="px-6 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={editData.rate ?? 0}
                            onChange={(e) => setEditData({ ...editData, rate: parseFloat(e.target.value) || 0 })}
                            className={inputClass + ' text-right'}
                          />
                        </td>
                        <td className="px-6 py-2">
                          <input
                            type="number"
                            step="0.25"
                            value={editData.hours ?? 0}
                            onChange={(e) => setEditData({ ...editData, hours: parseFloat(e.target.value) || 0 })}
                            className={inputClass + ' text-right'}
                          />
                        </td>
                        <td className="px-3 py-2">
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
                              onClick={() => { setEditId(null); setEditData({}) }}
                              className="rounded p-1 text-slate-400 hover:bg-slate-100"
                              title="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td
                          className="cursor-pointer px-6 py-3 text-slate-900"
                          onClick={() => startEdit(code)}
                        >
                          {code.description || <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-6 py-3 text-right text-slate-600">{code.department || '—'}</td>
                        <td className="px-6 py-3 text-right text-slate-600">{code.rate || '—'}</td>
                        <td className="px-6 py-3 text-right text-slate-600">{code.hours || '—'}</td>
                        <td className="px-3 py-3">
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete "${code.description || code.keyValue}"?`))
                                deleteMut.mutate(code.id)
                            }}
                            disabled={deleteMut.isPending}
                            className="rounded p-1 text-slate-400 opacity-0 transition-all hover:bg-red-100 hover:text-red-600 group-hover:opacity-100 disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
