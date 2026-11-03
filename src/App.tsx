import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { ActivityView } from './components/ActivityView'
import { CalendarView } from './components/CalendarView'
import { DashboardView } from './components/DashboardView'
import { HabitsView } from './components/HabitsView'
import { Header } from './components/Header'
import { SettingsView } from './components/SettingsView'
import { Sidebar } from './components/Sidebar'
import { StudyModal } from './components/StudyModal'
import { StudyView } from './components/StudyView'
import { TaskModal } from './components/TaskModal'
import { TasksView } from './components/TasksView'
import { ProgressView } from './components/ProgressView'
import { getLocalProfile, setLocalProfile, useWorkspaceData } from './lib/workspace'
import type { StudySession, Task, ViewKey } from './types'

export default function App() {
  // Login and registration are intentionally disabled. This version runs in local-only mode.
  const localMode = true
  const [localProfile, setLocalProfileState] = useState<'surbhi' | 'aaryan'>(() => getLocalProfile())
  const [view, setView] = useState<ViewKey>('dashboard')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => window.localStorage.getItem('duoplan-theme') === 'dark')
  const [search, setSearch] = useState('')
  const [taskModal, setTaskModal] = useState<{ open: boolean; task?: Task }>({ open: false })
  const [studyModal, setStudyModal] = useState<{ open: boolean; session?: StudySession }>({ open: false })
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [timerMinutes, setTimerMinutes] = useState(25)

  useEffect(() => { document.documentElement.classList.toggle('dark', darkMode); window.localStorage.setItem('duoplan-theme', darkMode ? 'dark' : 'light') }, [darkMode])
  return <PlannerApp localMode={localMode} localProfile={localProfile} setLocalProfile={(next) => { setLocalProfileState(next); setLocalProfile(next) }} view={view} setView={setView} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} darkMode={darkMode} setDarkMode={setDarkMode} search={search} setSearch={setSearch} taskModal={taskModal} setTaskModal={setTaskModal} studyModal={studyModal} setStudyModal={setStudyModal} notificationsOpen={notificationsOpen} setNotificationsOpen={setNotificationsOpen} timerMinutes={timerMinutes} setTimerMinutes={setTimerMinutes} onLogout={() => {}} />
}

function PlannerApp({ authUserId, localMode, localProfile, setLocalProfile, view, setView, mobileOpen, setMobileOpen, darkMode, setDarkMode, search, setSearch, taskModal, setTaskModal, studyModal, setStudyModal, notificationsOpen, setNotificationsOpen, timerMinutes, setTimerMinutes, onLogout }: { authUserId?: string; localMode: boolean; localProfile: 'surbhi' | 'aaryan'; setLocalProfile: (profile: 'surbhi' | 'aaryan') => void; view: ViewKey; setView: (view: ViewKey) => void; mobileOpen: boolean; setMobileOpen: (open: boolean) => void; darkMode: boolean; setDarkMode: (dark: boolean) => void; search: string; setSearch: (value: string) => void; taskModal: { open: boolean; task?: Task }; setTaskModal: (value: { open: boolean; task?: Task }) => void; studyModal: { open: boolean; session?: StudySession }; setStudyModal: (value: { open: boolean; session?: StudySession }) => void; notificationsOpen: boolean; setNotificationsOpen: (open: boolean) => void; timerMinutes: number; setTimerMinutes: (value: number) => void; onLogout: () => void }) {
  const workspace = useWorkspaceData(authUserId, localProfile, localMode)
  const { data, loading, error, upsertTask, toggleTask, deleteTask, upsertStudy, toggleStudy, upsertHabit, toggleHabit, updateSettings } = workspace
  const profile = workspace.currentMember?.memberNumber === 2 ? 'aaryan' : 'surbhi'
  const currentUserId = workspace.currentMember?.userId
  const currentDisplayName = workspace.currentMember?.displayName ?? workspace.memberNames[profile]
  const openTask = (task?: Task) => setTaskModal({ open: true, task })
  const openStudy = (session?: StudySession) => setStudyModal({ open: true, session })
  const saveTask = async (task: Parameters<typeof upsertTask>[0]) => { await upsertTask(task); setTaskModal({ open: false }) }
  const saveStudy = async (session: Parameters<typeof upsertStudy>[0]) => { await upsertStudy(session); setStudyModal({ open: false }) }
  const confirmDelete = (task: Task) => { if (window.confirm(`Delete “${task.title}”?`)) void deleteTask(task.id) }

  const displayView = useMemo(() => {
    switch (view) {
      case 'dashboard': return <DashboardView tasks={data.tasks} studies={data.studySessions} activity={data.activityLogs} currentUser={profile} currentUserId={currentUserId} members={workspace.members} memberNames={workspace.memberNames} displayName={currentDisplayName} setView={setView} onAddTask={() => openTask()} onAddStudy={() => openStudy()} onToggleTask={(id, userId) => void toggleTask(id, userId)} onToggleStudy={(id, userId) => void toggleStudy(id, userId)} />
      case 'my-tasks': return <TasksView tasks={data.tasks} currentUser={profile} currentUserId={currentUserId} members={workspace.members} duo={false} search={search} onAdd={() => openTask()} onEdit={openTask} onDelete={confirmDelete} onToggle={(id, userId) => void toggleTask(id, userId)} />
      case 'duo-tasks': return <TasksView tasks={data.tasks} currentUser={profile} currentUserId={currentUserId} members={workspace.members} duo search={search} onAdd={() => openTask()} onEdit={openTask} onDelete={confirmDelete} onToggle={(id, userId) => void toggleTask(id, userId)} />
      case 'study': return <StudyView sessions={data.studySessions} currentUser={profile} currentUserId={currentUserId} members={workspace.members} onAdd={() => openStudy()} onEdit={openStudy} onToggle={(id, userId) => void toggleStudy(id, userId)} timerMinutes={timerMinutes} setTimerMinutes={setTimerMinutes} />
      case 'calendar': return <CalendarView tasks={data.tasks} sessions={data.studySessions} currentUserId={currentUserId} members={workspace.members} onAddTask={() => openTask()} onToggleTask={(id, userId) => void toggleTask(id, userId)} onAddStudy={() => openStudy()} />
      case 'habits': return <HabitsView habits={data.habits} logs={data.habitLogs} currentUser={profile} onAdd={async (habit) => { await upsertHabit(habit) }} onToggle={(habitId, userKey) => void toggleHabit(habitId, userKey)} />
      case 'progress': return <ProgressView tasks={data.tasks} sessions={data.studySessions} />
      case 'activity': return <ActivityView activity={data.activityLogs} memberNames={workspace.memberNames} />
      case 'settings': return <SettingsView profile={profile} profileName={currentDisplayName} settings={data.settings} darkMode={darkMode} onToggleTheme={() => setDarkMode(!darkMode)} onSave={(values) => updateSettings(profile, values)} onInvite={undefined} />
    }
  }, [currentDisplayName, currentUserId, data, darkMode, profile, search, setView, timerMinutes, toggleHabit, toggleStudy, toggleTask, upsertHabit, updateSettings, view, workspace.createInvitation, workspace.memberNames, workspace.members])

  const unread = data.activityLogs.filter((item) => item.actorId !== profile).length > 0 ? Math.min(3, data.activityLogs.filter((item) => item.actorId !== profile).length) : 0
  return <div className="flex min-h-screen bg-[#f7f7fc] dark:bg-[#101321]"><Sidebar view={view} setView={setView} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} profile={profile} profileName={currentDisplayName} allowProfileSwitch={localMode} onSwitchProfile={() => setLocalProfile(profile === 'surbhi' ? 'aaryan' : 'surbhi')} darkMode={darkMode} onToggleTheme={() => setDarkMode(!darkMode)} onLogout={onLogout} /><div className="min-w-0 flex-1"><Header profile={profile} profileName={currentDisplayName} onAddTask={() => openTask()} onOpenNotifications={() => setNotificationsOpen(true)} unreadCount={unread} search={search} setSearch={setSearch} onMenu={() => setMobileOpen(true)} /><main className="mx-auto max-w-[1440px] px-4 py-7 sm:px-7 lg:px-10 lg:py-9">{loading && <div className="mb-5 rounded-2xl bg-lilac px-4 py-3 text-sm font-semibold text-violet-700 dark:bg-violet-950/30 dark:text-violet-200">Syncing your workspace…</div>}{error && <div className="mb-5 flex items-center gap-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 dark:bg-rose-950/30"><span className="flex-1">{error}</span><button onClick={() => workspace.refresh()}><X size={16} /></button></div>}{displayView}</main></div><TaskModal open={taskModal.open} task={taskModal.task} currentUser={profile} members={workspace.members} onClose={() => setTaskModal({ open: false })} onSave={saveTask} /><StudyModal open={studyModal.open} session={studyModal.session} currentUser={profile} members={workspace.members} onClose={() => setStudyModal({ open: false })} onSave={saveStudy} />{notificationsOpen && <div className="fixed inset-0 z-50 flex justify-end bg-ink/20 backdrop-blur-sm" onClick={() => setNotificationsOpen(false)}><div onClick={(event) => event.stopPropagation()} className="h-full w-full max-w-sm overflow-y-auto bg-white p-6 shadow-2xl dark:bg-slate-900"><div className="flex items-center justify-between"><div><p className="eyebrow">Notifications</p><h2 className="mt-1 font-display text-2xl font-bold text-ink dark:text-white">Stay in sync</h2></div><button onClick={() => setNotificationsOpen(false)} className="icon-button"><X size={18} /></button></div><div className="mt-6 space-y-3">{data.activityLogs.slice(0, 6).map((item) => <div key={item.id} className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-600 dark:bg-slate-800 dark:text-slate-200">{item.description}</div>)}</div></div></div>}</div>
}
