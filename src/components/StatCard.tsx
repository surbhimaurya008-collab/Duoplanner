import type { LucideIcon } from 'lucide-react'

export function StatCard({ icon: Icon, label, value, helper, tone = 'purple' }: { icon: LucideIcon; label: string; value: string | number; helper: string; tone?: 'purple' | 'green' | 'orange' | 'blue' }) {
  const tones = { purple: 'bg-lilac text-lavender', green: 'bg-mint text-emerald-600', orange: 'bg-peach text-orange-500', blue: 'bg-blue-50 text-blue-500 dark:bg-blue-950/40' }
  return <div className="card flex min-h-[150px] flex-col justify-between p-5"><div className="flex items-start justify-between gap-3"><div><p className="eyebrow">{label}</p><p className="mt-3 font-display text-3xl font-bold tracking-tight text-ink dark:text-white">{value}</p></div><div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tones[tone]}`}><Icon size={20} /></div></div><p className="text-xs font-semibold text-slate-400">{helper}</p></div>
}
