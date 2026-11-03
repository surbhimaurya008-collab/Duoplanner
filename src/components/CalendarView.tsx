import { BookOpen, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, LayoutGrid, List, Plus, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { addDays, formatDate, formatLongDate, isoDate } from '../lib/date'
import type { StudySession, Task, WorkspaceMember } from '../types'
import { ProgressBar } from './ProgressBar'
import { TaskRow } from './TaskRow'

type CalendarMode = 'week' | 'agenda'

const rangeOptions = [7, 14, 30]

export function CalendarView({ tasks, sessions, currentUserId, members, onAddTask, onToggleTask, onAddStudy }: { tasks: Task[]; sessions: StudySession[]; currentUserId?: string; members: WorkspaceMember[]; onAddTask: () => void; onToggleTask: (id: string, userId?: string) => void; onAddStudy: () => void }) {
  const today = isoDate()
  const [start, setStart] = useState(today)
  const [selectedDate, setSelectedDate] = useState(today)
  const [rangeDays, setRangeDays] = useState(7)
  const [mode, setMode] = useState<CalendarMode>('week')

  const dates = useMemo(() => Array.from({ length: rangeDays }, (_, index) => addDays(start, index)), [rangeDays, start])
  const selectedTasks = tasks.filter((task) => task.taskDate === selectedDate)
  const selectedSessions = sessions.filter((session) => session.studyDate === selectedDate)
  const totalScheduled = dates.reduce((total, date) => total + tasks.filter((task) => task.taskDate === date).length, 0)
  const totalCompleted = dates.reduce((total, date) => total + tasks.filter((task) => task.taskDate === date && task.isCompleted).length, 0)
  const totalSessions = dates.reduce((total, date) => total + sessions.filter((session) => session.studyDate === date).length, 0)
  const completion = totalScheduled ? Math.round((totalCompleted / totalScheduled) * 100) : 0

  const moveRange = (direction: -1 | 1) => {
    const nextStart = addDays(start, direction * rangeDays)
    setStart(nextStart)
    setSelectedDate(nextStart)
  }

  const jumpToToday = () => {
    setStart(today)
    setSelectedDate(today)
  }

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
      <div>
        <p className="eyebrow">Plan with a little more clarity</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink dark:text-white sm:text-4xl">Calendar</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">See your tasks and study blocks together, move through any planning horizon, and keep the next right thing in view.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={onAddStudy} className="btn-secondary"><BookOpen size={16} /> Study block</button>
        <button onClick={onAddTask} className="btn-primary"><Plus size={16} /> Add task</button>
      </div>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard icon={CalendarDays} label="Planning window" value={`${rangeDays} days`} helper={`${formatDate(dates[0])} – ${formatDate(dates[dates.length - 1])}`} />
      <SummaryCard icon={CheckCircle2} label="Tasks completed" value={`${totalCompleted}/${totalScheduled}`} helper={`${completion}% of scheduled tasks`} tone="green" />
      <SummaryCard icon={BookOpen} label="Study blocks" value={totalSessions} helper="Planned in this window" tone="blue" />
      <SummaryCard icon={Sparkles} label="Selected day" value={formatDate(selectedDate, { day: 'numeric', month: 'short' })} helper={selectedDate === today ? 'Today · keep the momentum' : formatDate(selectedDate, { weekday: 'long' })} tone="orange" />
    </div>

    <div className="card p-4 sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center justify-between gap-3">
          <button aria-label="Previous planning period" onClick={() => moveRange(-1)} className="icon-button"><ChevronLeft size={18} /></button>
          <div className="min-w-0 text-center"><p className="eyebrow">Selected planning period</p><p className="mt-1 truncate font-display text-lg font-bold text-ink dark:text-white">{formatDate(dates[0], { month: 'short', day: 'numeric' })} – {formatDate(dates[dates.length - 1], { month: 'short', day: 'numeric', year: 'numeric' })}</p></div>
          <button aria-label="Next planning period" onClick={() => moveRange(1)} className="icon-button"><ChevronRight size={18} /></button>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 xl:justify-end">
          <button onClick={jumpToToday} className="btn-secondary">Today</button>
          <label className="relative"><span className="sr-only">Jump to date</span><input type="date" value={start} onChange={(event) => { setStart(event.target.value); setSelectedDate(event.target.value) }} className="input min-w-[150px]" /></label>
          <div className="flex rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">{rangeOptions.map((option) => <button key={option} onClick={() => setRangeDays(option)} className={`rounded-xl px-3 py-2 text-xs font-bold transition ${rangeDays === option ? 'bg-white text-lavender shadow-sm dark:bg-slate-700' : 'text-slate-500 dark:text-slate-400'}`}>{option}d</button>)}</div>
          <div className="flex rounded-2xl bg-slate-100 p-1 dark:bg-slate-800"><button aria-label="Grid view" onClick={() => setMode('week')} className={`rounded-xl p-2 transition ${mode === 'week' ? 'bg-white text-lavender shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}><LayoutGrid size={16} /></button><button aria-label="Agenda view" onClick={() => setMode('agenda')} className={`rounded-xl p-2 transition ${mode === 'agenda' ? 'bg-white text-lavender shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}><List size={16} /></button></div>
        </div>
      </div>
    </div>

    {mode === 'week' ? <div className="space-y-4">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 xl:hidden">{dates.map((date) => <DayPicker key={date} date={date} selected={date === selectedDate} today={date === today} taskCount={tasks.filter((task) => task.taskDate === date).length} onClick={() => setSelectedDate(date)} />)}</div>
      <div className={`grid gap-4 ${rangeDays === 7 ? 'md:grid-cols-2 xl:grid-cols-7' : 'md:grid-cols-2 xl:grid-cols-4'}`}>{dates.map((date) => <DayCard key={date} date={date} today={today} selected={selectedDate === date} tasks={tasks.filter((task) => task.taskDate === date)} sessions={sessions.filter((session) => session.studyDate === date)} currentUserId={currentUserId} members={members} onSelect={() => setSelectedDate(date)} onToggleTask={onToggleTask} />)}</div>
    </div> : <AgendaView dates={dates} today={today} selectedDate={selectedDate} selectedTasks={selectedTasks} selectedSessions={selectedSessions} currentUserId={currentUserId} members={members} onSelect={setSelectedDate} onToggleTask={onToggleTask} onAddTask={onAddTask} onAddStudy={onAddStudy} />}
  </div>
}

function SummaryCard({ icon: Icon, label, value, helper, tone = 'purple' }: { icon: typeof CalendarDays; label: string; value: string | number; helper: string; tone?: 'purple' | 'green' | 'blue' | 'orange' }) {
  const colors = { purple: 'bg-lilac text-lavender', green: 'bg-mint text-emerald-600', blue: 'bg-blue-50 text-blue-500 dark:bg-blue-950/40', orange: 'bg-peach text-orange-500' }
  return <div className="card flex min-h-[132px] flex-col justify-between p-5"><div className="flex items-start justify-between gap-3"><div><p className="eyebrow">{label}</p><p className="mt-3 font-display text-2xl font-bold text-ink dark:text-white">{value}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${colors[tone]}`}><Icon size={18} /></span></div><p className="text-xs font-semibold text-slate-400">{helper}</p></div>
}

function DayPicker({ date, selected, today, taskCount, onClick }: { date: string; selected: boolean; today: boolean; taskCount: number; onClick: () => void }) {
  return <button onClick={onClick} className={`min-w-[82px] rounded-2xl border px-3 py-3 text-center transition ${selected ? 'border-lavender bg-lilac shadow-sm dark:bg-violet-950/40' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'}`}><p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">{formatDate(date, { weekday: 'short' })}</p><p className={`mt-1 font-display text-xl font-bold ${today ? 'text-lavender' : 'text-ink dark:text-white'}`}>{formatDate(date, { day: 'numeric' })}</p><p className="mt-1 text-[10px] font-bold text-slate-400">{taskCount} {taskCount === 1 ? 'task' : 'tasks'}</p></button>
}

function DayCard({ date, today, selected, tasks, sessions, currentUserId, members, onSelect, onToggleTask }: { date: string; today: string; selected: boolean; tasks: Task[]; sessions: StudySession[]; currentUserId?: string; members: WorkspaceMember[]; onSelect: () => void; onToggleTask: (id: string, userId?: string) => void }) {
  const completed = tasks.filter((task) => task.isCompleted).length
  const percent = tasks.length ? Math.round((completed / tasks.length) * 100) : 0
  return <div className={`card min-h-[265px] overflow-hidden p-3 transition ${selected ? 'border-lavender ring-4 ring-lilac dark:ring-violet-950/40' : ''}`}><button onClick={onSelect} className="w-full rounded-2xl px-2 py-2 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60"><div className="flex items-start justify-between gap-2"><div><p className="text-[11px] font-bold uppercase tracking-[.13em] text-slate-400">{formatDate(date, { weekday: 'short' })}</p><div className="mt-1 flex items-center gap-2"><span className={`font-display text-2xl font-bold ${date === today ? 'text-lavender' : 'text-ink dark:text-white'}`}>{formatDate(date, { day: 'numeric' })}</span>{date === today && <span className="rounded-lg bg-lilac px-1.5 py-0.5 text-[9px] font-bold uppercase text-lavender">Today</span>}</div></div><span className="rounded-xl bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500 dark:bg-slate-800">{tasks.length + sessions.length}</span></div><div className="mt-3 flex items-center gap-2"><ProgressBar value={percent} className="flex-1" /><span className="text-[10px] font-bold text-slate-400">{percent}%</span></div></button><div className="mt-2 space-y-1">{tasks.slice(0, 3).map((task) => <TaskRow key={task.id} task={task} onToggle={() => onToggleTask(task.id, currentUserId)} onToggleForUser={(userId) => onToggleTask(task.id, userId)} currentUserId={currentUserId} members={members} compact />)}{sessions.slice(0, 2).map((session) => <div key={session.id} className="rounded-xl border border-violet-100 bg-violet-50/70 px-2.5 py-2 text-xs font-bold text-violet-700 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-200"><div className="flex items-center gap-1.5"><BookOpen size={13} /> <span className="truncate">{session.subject} · {session.topic}</span></div><p className="mt-1 pl-5 text-[10px] font-semibold opacity-70">{session.startTime || 'Anytime'} · {session.plannedMinutes} min</p></div>)}{tasks.length > 3 && <p className="px-2 pt-2 text-[11px] font-bold text-lavender">+{tasks.length - 3} more tasks</p>}{sessions.length > 2 && <p className="px-2 pt-2 text-[11px] font-bold text-violet-500">+{sessions.length - 2} more study blocks</p>}{!tasks.length && !sessions.length && <div className="rounded-2xl border border-dashed border-slate-200 px-3 py-7 text-center dark:border-slate-700"><CalendarDays className="mx-auto text-slate-300" size={20} /><p className="mt-2 text-[11px] font-semibold text-slate-400">Open space</p></div>}</div></div>
}

function AgendaView({ dates, today, selectedDate, selectedTasks, selectedSessions, currentUserId, members, onSelect, onToggleTask, onAddTask, onAddStudy }: { dates: string[]; today: string; selectedDate: string; selectedTasks: Task[]; selectedSessions: StudySession[]; currentUserId?: string; members: WorkspaceMember[]; onSelect: (date: string) => void; onToggleTask: (id: string, userId?: string) => void; onAddTask: () => void; onAddStudy: () => void }) {
  return <div className="grid gap-5 xl:grid-cols-[.36fr_1fr]"><div className="card p-3"><div className="mb-2 px-2 py-2"><p className="eyebrow">Choose a day</p><p className="mt-1 text-sm font-bold text-ink dark:text-white">Your agenda</p></div><div className="space-y-1">{dates.map((date) => { const count = date === selectedDate ? selectedTasks.length + selectedSessions.length : 0; return <button key={date} onClick={() => onSelect(date)} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${date === selectedDate ? 'bg-lilac text-lavender dark:bg-violet-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}><span className={`flex h-10 w-10 flex-col items-center justify-center rounded-xl ${date === today ? 'bg-white text-lavender shadow-sm dark:bg-slate-700' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}><span className="text-[9px] font-bold uppercase">{formatDate(date, { weekday: 'short' })}</span><span className="font-display text-lg font-bold">{formatDate(date, { day: 'numeric' })}</span></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{date === today ? 'Today' : formatDate(date, { weekday: 'long' })}</span><span className="block text-[11px] font-semibold opacity-65">{count ? `${count} scheduled` : 'Tap to view plans'}</span></span>{date === today && <span className="h-2 w-2 rounded-full bg-lavender" />}</button> })}</div></div><div className="card p-5 sm:p-7"><div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 dark:border-slate-800 sm:flex-row sm:items-start"><div><p className="eyebrow">{selectedDate === today ? 'Today' : 'Selected day'}</p><h2 className="mt-1 font-display text-2xl font-bold text-ink dark:text-white">{formatLongDate(selectedDate)}</h2><p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-slate-400"><Clock3 size={15} /> {selectedTasks.length + selectedSessions.length} planned items</p></div><div className="flex gap-2"><button onClick={onAddStudy} className="btn-secondary"><BookOpen size={15} /> Study</button><button onClick={onAddTask} className="btn-primary"><Plus size={15} /> Task</button></div></div><div className="mt-6 space-y-6"><section><div className="mb-3 flex items-center justify-between"><div><p className="eyebrow">Tasks</p><h3 className="mt-1 font-display text-lg font-bold text-ink dark:text-white">{selectedTasks.length ? `${selectedTasks.length} task${selectedTasks.length === 1 ? '' : 's'}` : 'No tasks planned'}</h3></div><span className="rounded-xl bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500 dark:bg-slate-800">{selectedTasks.filter((task) => task.isCompleted).length} done</span></div>{selectedTasks.length ? <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 p-2 dark:divide-slate-800 dark:border-slate-800">{selectedTasks.map((task) => <TaskRow key={task.id} task={task} onToggle={() => onToggleTask(task.id, currentUserId)} onToggleForUser={(userId) => onToggleTask(task.id, userId)} currentUserId={currentUserId} members={members} compact />)}</div> : <EmptyAgenda label="A quiet day is still a good day. Add a task when you are ready." />}</section><section><div className="mb-3 flex items-center justify-between"><div><p className="eyebrow">Study blocks</p><h3 className="mt-1 font-display text-lg font-bold text-ink dark:text-white">{selectedSessions.length ? `${selectedSessions.length} session${selectedSessions.length === 1 ? '' : 's'}` : 'No study blocks planned'}</h3></div><BookOpen className="text-violet-400" size={19} /></div>{selectedSessions.length ? <div className="grid gap-3 sm:grid-cols-2">{selectedSessions.map((session) => <div key={session.id} className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4 dark:border-violet-900 dark:bg-violet-950/30"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-violet-800 dark:text-violet-100">{session.subject}</p><p className="mt-1 text-xs font-semibold text-violet-600/80 dark:text-violet-200/70">{session.topic}</p></div><span className={`rounded-lg px-2 py-1 text-[10px] font-bold ${session.isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-violet-600 dark:bg-slate-800'}`}>{session.isCompleted ? 'Done' : `${session.plannedMinutes}m`}</span></div><p className="mt-4 text-xs font-bold text-violet-700 dark:text-violet-200">{session.startTime || 'Flexible'}{session.endTime ? ` – ${session.endTime}` : ''}</p></div>)}</div> : <EmptyAgenda label="Use a study block to protect your focus time." />}</section></div></div></div>
}

function EmptyAgenda({ label }: { label: string }) { return <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-center text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800">{label}</div> }
