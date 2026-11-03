import { CircleCheck, Clock3, MoreHorizontal, Users } from 'lucide-react'
import type { MemberKey, Task, WorkspaceMember } from '../types'
import { categoryMeta } from '../types'
import { formatDate } from '../lib/date'
import { Avatar } from './Avatar'
import { canManageOwnedRecord } from '../lib/permissions'

export function TaskRow({ task, onToggle, onToggleForUser, onEdit, onDelete, compact = false, currentUserId, members = [] }: { task: Task; onToggle: () => void; onToggleForUser?: (userId: string) => void; onEdit?: () => void; onDelete?: () => void; compact?: boolean; currentUserId?: string; members?: WorkspaceMember[] }) {
  const overdue = !task.isCompleted && `${task.taskDate}T${task.dueTime || '23:59'}` < new Date().toISOString().slice(0, 16)
  const meta = categoryMeta[task.category] ?? categoryMeta.Other
  const assignedUserIds = task.assignedUserIds?.length ? task.assignedUserIds : fallbackAssignedIds(task.assignedTo, members)
  const isShared = assignedUserIds.length > 1 || task.assignedTo === 'both'
  const canManage = canManageOwnedRecord(task.createdBy, currentUserId)
  const getMember = (userId: string, index: number) => members.find((member) => member.userId === userId) ?? members[index] ?? { userId, memberNumber: index === 0 ? 1 : 2, displayName: index === 0 ? 'User 1' : 'User 2' as const }
  const handleToggle = (userId: string) => { if (onToggleForUser) onToggleForUser(userId); else onToggle() }
  const actionButtons = canManage && (onEdit || onDelete) && <div className="relative"><button aria-label={`More actions for ${task.title}`} className="icon-button h-8 w-8 border-0 bg-transparent opacity-0 transition group-hover:opacity-100"><MoreHorizontal size={17} /></button><div className="pointer-events-none absolute right-0 top-9 z-10 w-28 rounded-xl border border-slate-100 bg-white p-1 opacity-0 shadow-lg transition group-focus-within:pointer-events-auto group-focus-within:opacity-100 dark:border-slate-700 dark:bg-slate-800"><button onClick={onEdit} className="w-full rounded-lg px-2 py-1.5 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700">Edit</button><button onClick={onDelete} className="w-full rounded-lg px-2 py-1.5 text-left text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30">Delete</button></div></div>
  return <div className={`group flex items-start gap-3 rounded-2xl px-3 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/60 ${task.isCompleted ? 'opacity-65' : ''}`}>
    {!isShared && <CompletionButton task={task} userId={assignedUserIds[0]} currentUserId={currentUserId} onToggle={handleToggle} />}
    {isShared && <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-lilac text-lavender dark:bg-violet-950/40"><Users size={14} /></div>}
    <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className={`truncate text-sm font-bold ${task.isCompleted ? 'text-slate-400 line-through' : 'text-ink dark:text-slate-100'}`}>{task.title}</p><span className="hidden shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold sm:inline" style={{ background: `${meta.color}18`, color: meta.color }}>{meta.icon} {task.category}</span></div>{!compact && <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-400"><span>{formatDate(task.taskDate)}</span>{task.dueTime && <span className={overdue ? 'font-bold text-rose-500' : ''}><Clock3 className="mr-1 inline" size={12} />{task.dueTime}{overdue ? ' · overdue' : ''}</span>}<span className="capitalize">{task.priority} priority</span></div>}{isShared && <div className="mt-2 flex flex-wrap gap-2">{assignedUserIds.map((userId, index) => { const member = getMember(userId, index); const completion = task.completions.find((item) => item.userId === userId); return <button key={userId} disabled={Boolean(currentUserId && currentUserId !== userId)} onClick={() => handleToggle(userId)} title={currentUserId && currentUserId !== userId ? `Only ${member.displayName} can update this checkbox` : `Mark ${member.displayName}'s portion ${completion?.isCompleted ? 'incomplete' : 'complete'}`} className={`inline-flex items-center gap-1.5 rounded-xl border px-2 py-1 text-[10px] font-bold transition ${completion?.isCompleted ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/30' : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-800'} disabled:cursor-not-allowed disabled:opacity-55`}><span className={`flex h-4 w-4 items-center justify-center rounded-full border ${completion?.isCompleted ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 text-transparent dark:border-slate-600'}`}><CircleCheck size={10} /></span>{member.displayName}</button> })}</div>}</div>
    {!isShared && <AssigneeAvatar userId={assignedUserIds[0]} member={getMember(assignedUserIds[0], 0)} />}
    {actionButtons}
  </div>
}

function CompletionButton({ task, userId, currentUserId, onToggle }: { task: Task; userId?: string; currentUserId?: string; onToggle: (userId: string) => void }) {
  const completion = task.completions.find((item) => item.userId === userId)
  const disabled = Boolean(currentUserId && userId && currentUserId !== userId)
  return <button aria-label={`${completion?.isCompleted ? 'Mark incomplete' : 'Complete'} ${task.title}`} disabled={disabled || !userId} onClick={() => userId && onToggle(userId)} title={disabled ? 'Only the assigned user can update this task' : undefined} className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${completion?.isCompleted ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 text-transparent hover:border-lavender dark:border-slate-600'} disabled:cursor-not-allowed disabled:opacity-45`}><CircleCheck size={14} strokeWidth={3} /></button>
}

function AssigneeAvatar({ userId, member }: { userId?: string; member: WorkspaceMember }) {
  const slot: MemberKey = member.memberNumber === 2 ? 'aaryan' : 'surbhi'
  return <div className="flex items-center gap-2"><Avatar user={slot} size="sm" displayName={member.displayName} /><span className="hidden max-w-24 truncate text-xs font-semibold text-slate-400 lg:inline">{member.displayName}</span></div>
}

function fallbackAssignedIds(assignedTo: MemberKey, members: WorkspaceMember[]) {
  if (members.length) {
    if (assignedTo === 'both') return members.map((member) => member.userId)
    const member = members.find((item) => item.memberNumber === (assignedTo === 'surbhi' ? 1 : 2))
    return member ? [member.userId] : []
  }
  return assignedTo === 'both' ? ['local-user-1', 'local-user-2'] : [assignedTo === 'surbhi' ? 'local-user-1' : 'local-user-2']
}
