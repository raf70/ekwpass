import { Construction } from 'lucide-react'

interface PlaceholderPageProps {
  title: string
}

export default function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>

      <div className="mt-6 rounded-xl border bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <Construction className="h-8 w-8" />
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
            Coming Soon
          </span>
          <p className="mt-4 max-w-sm text-center text-sm text-slate-500">
            The {title} module is currently under development. Check back soon for updates.
          </p>
        </div>
      </div>
    </div>
  )
}
