import { useEffect, useMemo, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { Modal } from './Modal'
import { categories, type MemberKey, type Task, type TaskPriority, type WorkspaceMember } from '../types'
import { isoDate } from '../lib/date'

type TaskForm = { id?: string; title: string; description?: string; taskDate: string; dueTime?: string; category: string; priority: TaskPriority; assignedTo: MemberKey; notes?: string; createdBy?: string; isCompleted?: boolean; completedAt?: string | null }

const blank = (currentUser: 'surbhi' | 'aaryan'): TaskForm => ({ title: '', description: '', taskDate: isoDate(), dueTime: '', category: 'Study', priority: 'medium', assignedTo: currentUser, notes: '', isCompleted: false, completedAt: null })

function slotKey(member: WorkspaceMember): Exclude<MemberKey, 'both'> {
  return member.memberNumber === 2 ? 'aaryan' : 'surbhi'
}

export function TaskModal({ open, onClose, onSave, currentUser, task, members }: { open: boolean; onClose: () => void; onSave: (task: TaskForm) => Promise<void>; currentUser: 'surbhi' | 'aaryan'; task?: Task; members: WorkspaceMember[] }) {
  const [form, setForm] = useState<TaskForm>(() => task ? { ...task } : blank(currentUser))
  const [saving, setSaving] = useState(false)
  const assignmentOptions = useMemo<MemberKey[]>(() => {
    if (task) return [task.assignedTo]
    const available = members.filter((member) => member.memberNumber === 1 || member.memberNumber === 2).map(slotKey)
    return available.length > 1 ? [...available, 'both'] : available.length ? available : [currentUser]
  }, [currentUser, members, task])

  useEffect(() => {
    if (open) setForm(task ? { ...task } : blank(currentUser))
  }, [currentUser, open, task])

  const set = (key: keyof TaskForm, value: string | boolean | null) => setForm((previous) => ({ ...previous, [key]: value }))
  const labelFor = (member: MemberKey) => {
    if (member === 'both') return 'Both users'
    return members.find((item) => slotKey(item) === member)?.displayName ?? (member === 'surbhi' ? 'User 1' : 'User 2')
  }
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try { await onSave({ ...form, title: form.title.trim() }) } finally { setSaving(false) }
  }

  return <Modal open={open} title={task ? 'Edit task' : 'Add a task'} subtitle="Keep it clear, kind, and doable." onClose={onClose} wide>
    <form onSubmit={submit} className="space-y-4">
      <div><label className="label">Task title *</label><input autoFocus required value={form.title} onChange={(event) => set('title', event.target.value)} className="input" placeholder="e.g. Finish chapter 4 notes" /></div>
      <div><label className="label">Description</label><textarea value={form.description ?? ''} onChange={(event) => set('description', event.target.value)} className="input min-h-24 resize-none" placeholder="Add context or a tiny next step..." /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label">Date</label><input type="date" value={form.taskDate} onChange={(event) => set('taskDate', event.target.value)} className="input" /></div>
        <div><label className="label">Due time</label><input type="time" value={form.dueTime ?? ''} onChange={(event) => set('dueTime', event.target.value)} className="input" /></div>
        <div><label className="label">Category</label><select value={form.category} onChange={(event) => set('category', event.target.value)} className="input">{categories.map((category) => <option key={category}>{category}</option>)}</select></div>
        <div><label className="label">Priority</label><select value={form.priority} onChange={(event) => set('priority', event.target.value as TaskPriority)} className="input"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
      </div>
      <div>
        <label className="label">Assign to</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{assignmentOptions.map((member) => <button disabled={Boolean(task)} type="button" key={member} onClick={() => set('assignedTo', member)} className={`rounded-2xl border px-3 py-2.5 text-sm font-bold transition ${form.assignedTo === member ? 'border-lavender bg-lilac text-lavender dark:bg-violet-950/30' : 'border-slate-200 text-slate-500 hover:border-lavender dark:border-slate-700 dark:text-slate-300'} disabled:cursor-not-allowed disabled:opacity-70`}>{labelFor(member)}</button>)}</div>
        {task && <p className="mt-1.5 text-[11px] font-semibold text-slate-400">Assignment is locked after creation so each user keeps control of their own completion.</p>}
      </div>
      <div><label className="label">Notes</label><textarea value={form.notes ?? ''} onChange={(event) => set('notes', event.target.value)} className="input min-h-20 resize-none" placeholder="Anything helpful to remember?" /></div>
      <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button disabled={saving} className="btn-primary">{saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} {task ? 'Save changes' : 'Add task'}</button></div>
    </form>
  </Modal>
}
