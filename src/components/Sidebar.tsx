import { Activity, BarChart3, CalendarDays, CheckSquare, ChevronRight, ClipboardList, Dumbbell, LayoutDashboard, LogOut, Menu, Moon, Settings, Sparkles, Sun, Target, X } from 'lucide-react'
import type { ViewKey } from '../types'
import { Avatar } from './Avatar'

const navItems: { key: ViewKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'my-tasks', label: 'My Tasks', icon: CheckSquare },
  { key: 'duo-tasks', label: 'Duo Tasks', icon: ClipboardList },
  { key: 'study', label: 'Study Room', icon: Target },
  { key: 'calendar', label: 'Calendar', icon: CalendarDays },
  { key: 'habits', label: 'Habits', icon: Dumbbell },
  { key: 'progress', label: 'Progress & Analytics', icon: BarChart3 },
  { key: 'activity', label: 'Activity Feed', icon: Activity },
]

export function Sidebar({ view, setView, mobileOpen, onClose, profile, profileName, allowProfileSwitch = false, onSwitchProfile, darkMode, onToggleTheme, onLogout }: { view: ViewKey; setView: (view: ViewKey) => void; mobileOpen: boolean; onClose: () => void; profile: 'surbhi' | 'aaryan'; profileName: string; allowProfileSwitch?: boolean; onSwitchProfile: () => void; darkMode: boolean; onToggleTheme: () => void; onLogout: () => void }) {
  return <>
    {mobileOpen && <button aria-label="Close navigation" onClick={onClose} className="fixed inset-0 z-30 bg-ink/25 lg:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r border-slate-200/80 bg-[#fbfaff] px-5 py-6 transition-transform dark:border-slate-800 dark:bg-slate-950 lg:static lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="mb-10 flex items-center justify-between"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ink text-white shadow-lg shadow-violet-200 dark:bg-lavender dark:shadow-none"><Sparkles size={19} /></div><div><p className="font-display text-lg font-bold tracking-tight text-ink dark:text-white">DuoPlan</p><p className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Our daily planner</p></div></div><button onClick={onClose} className="icon-button h-8 w-8 border-0 bg-transparent lg:hidden"><X size={18} /></button></div>
      <div className="mb-5"><p className="eyebrow px-3">Workspace</p><button className="mt-2 flex w-full items-center gap-3 rounded-2xl bg-lilac px-3 py-3 text-left dark:bg-violet-950/40"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-lavender shadow-sm dark:bg-slate-800"><Sparkles size={17} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-ink dark:text-white">User 1 & User 2</p><p className="text-[11px] font-semibold text-slate-500">Shared space</p></div><ChevronRight size={15} className="text-slate-400" /></button></div>
      <nav className="flex-1 space-y-1">{navItems.map(({ key, label, icon: Icon }) => <button key={key} onClick={() => { setView(key); onClose() }} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-bold transition ${view === key ? 'bg-ink text-white shadow-lg shadow-slate-200 dark:bg-lavender dark:shadow-none' : 'text-slate-500 hover:bg-white hover:text-ink dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white'}`}><Icon size={18} /><span>{label}</span>{key === 'activity' && <span className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] ${view === key ? 'bg-white/15' : 'bg-rose-100 text-rose-500'}`}>3</span>}</button>)}</nav>
      <div className="border-t border-slate-200/80 pt-4 dark:border-slate-800"><button onClick={() => setView('settings')} className={`mb-1 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-bold transition ${view === 'settings' ? 'bg-ink text-white dark:bg-lavender' : 'text-slate-500 hover:bg-white hover:text-ink dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white'}`}><Settings size={18} /> Settings</button><button onClick={onToggleTheme} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-bold text-slate-500 transition hover:bg-white hover:text-ink dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white">{darkMode ? <Sun size={18} /> : <Moon size={18} />} {darkMode ? 'Light mode' : 'Dark mode'}</button><button onClick={allowProfileSwitch ? onSwitchProfile : onLogout} className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-2.5 text-left dark:border-slate-800 dark:bg-slate-900"><Avatar user={profile} size="sm" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-ink dark:text-white">{profileName}</p><p className="text-[11px] text-slate-400">{allowProfileSwitch ? 'Switch user' : 'Profile'}</p></div><LogOut size={15} className="text-slate-400" /></button></div>
    </aside>
  </>
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) { return <button onClick={onClick} aria-label="Open navigation" className="icon-button lg:hidden"><Menu size={20} /></button> }
