import type { ReactNode } from 'react'
import { X } from 'lucide-react'

export function Modal({ open, title, subtitle, onClose, children, wide = false }: { open: boolean; title: string; subtitle?: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  if (!open) return null
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true"><div className={`max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl dark:bg-slate-900 sm:rounded-3xl sm:p-7 ${wide ? 'max-w-2xl' : 'max-w-lg'}`}><div className="mb-6 flex items-start justify-between gap-5"><div><h2 className="font-display text-2xl font-bold text-ink dark:text-white">{title}</h2>{subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}</div><button onClick={onClose} aria-label="Close dialog" className="icon-button"><X size={18} /></button></div>{children}</div></div>
}
