import type { CSSProperties } from 'react'
import type { MemberKey } from '../types'

const profileColors: Record<'surbhi' | 'aaryan', CSSProperties> = {
  surbhi: { background: 'linear-gradient(145deg, #c9bcff, #8c77ee)' },
  aaryan: { background: 'linear-gradient(145deg, #9ce4dd, #43abae)' },
}

export function Avatar({ user, size = 'md', showRing = false, displayName }: { user: Exclude<MemberKey, 'both'>; size?: 'sm' | 'md' | 'lg'; showRing?: boolean; displayName?: string }) {
  const initials = displayName?.trim()?.slice(0, 1).toUpperCase() || (user === 'surbhi' ? '1' : '2')
  const sizeClass = size === 'sm' ? 'h-7 w-7 text-[10px]' : size === 'lg' ? 'h-14 w-14 text-lg' : 'h-10 w-10 text-sm'
  return <div className={`${sizeClass} ${showRing ? 'ring-4 ring-white dark:ring-slate-900' : ''} flex shrink-0 items-center justify-center rounded-2xl font-display font-bold text-white shadow-sm`} style={profileColors[user]}>{initials}</div>
}
