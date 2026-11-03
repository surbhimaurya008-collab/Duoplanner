export function ProgressBar({ value, color = '#8b7cf6', className = '' }: { value: number; color?: string; className?: string }) {
  const safe = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))
  return <div className={`h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 ${className}`}><div className="h-full rounded-full transition-all duration-500" style={{ width: `${safe}%`, background: color }} /></div>
}
