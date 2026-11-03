import { useEffect, useMemo, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { Modal } from './Modal'
import type { MemberKey, StudySession, WorkspaceMember } from '../types'
import { isoDate, minutesBetween } from '../lib/date'

type StudyForm = { id?: string; subject: string; topic: string; studyDate: string; startTime?: string; endTime?: string; plannedMinutes: number; actualMinutes?: number; assignedTo: MemberKey; studyGoal?: string; notes?: string; isCompleted?: boolean; completedAt?: string | null }

const initial = (user: 'surbhi' | 'aaryan'): StudyForm => ({ subject: '', topic: '', studyDate: isoDate(), startTime: '18:00', endTime: '19:00', plannedMinutes: 60, actualMinutes: 0, assignedTo: user, studyGoal: '', notes: '', isCompleted: false, completedAt: null })

function slotKey(member: WorkspaceMember): Exclude<MemberKey, 'both'> {
  return member.memberNumber === 2 ? 'aaryan' : 'surbhi'
}

export function StudyModal({ open, onClose, onSave, currentUser, session, members }: { open: boolean; onClose: () => void; onSave: (session: StudyForm) => Promise<void>; currentUser: 'surbhi' | 'aaryan'; session?: StudySession; members: WorkspaceMember[] }) {
  const [form, setForm] = useState<StudyForm>(() => session ? { ...session } : initial(currentUser))
  const [saving, setSaving] = useState(false)
  const assignmentOptions = useMemo<MemberKey[]>(() => {
    if (session) return [session.assignedTo]
    const available = members.filter((member) => member.memberNumber === 1 || member.memberNumber === 2).map(slotKey)
    return available.length > 1 ? [...available, 'both'] : available.length ? available : [currentUser]
  }, [currentUser, members, session])

  useEffect(() => {
    if (open) setForm(session ? { ...session } : initial(currentUser))
  }, [currentUser, open, session])

  useEffect(() => {
    const minutes = minutesBetween(form.startTime, form.endTime)
    if (minutes > 0) setForm((previous) => previous.plannedMinutes === minutes ? previous : { ...previous, plannedMinutes: minutes })
  }, [form.endTime, form.startTime])

  const set = (key: keyof StudyForm, value: string | number | boolean | null) => setForm((previous) => ({ ...previous, [key]: value }))
  const labelFor = (member: MemberKey) => {
    if (member === 'both') return 'Both users'
    return members.find((item) => slotKey(item) === member)?.displayName ?? (member === 'surbhi' ? 'User 1' : 'User 2')
  }
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.subject.trim() || !form.topic.trim()) return
    setSaving(true)
    try { await onSave({ ...form, subject: form.subject.trim(), topic: form.topic.trim(), plannedMinutes: Number(form.plannedMinutes) }) } finally { setSaving(false) }
  }

  return <Modal open={open} title={session ? 'Edit study session' : 'Plan a study session'} subtitle="Make the next session easy to start." onClose={onClose}>
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label">Subject *</label><input required value={form.subject} onChange={(event) => set('subject', event.target.value)} className="input" placeholder="Java" /></div>
        <div><label className="label">Topic or chapter *</label><input required value={form.topic} onChange={(event) => set('topic', event.target.value)} className="input" placeholder="Exception handling" /></div>
        <div><label className="label">Study date</label><input type="date" value={form.studyDate} onChange={(event) => set('studyDate', event.target.value)} className="input" /></div>
        <div><label className="label">Assigned to</label><select disabled={Boolean(session)} value={form.assignedTo} onChange={(event) => set('assignedTo', event.target.value as MemberKey)} className="input">{assignmentOptions.map((member) => <option key={member} value={member}>{labelFor(member)}</option>)}</select>{session && <p className="mt-1.5 text-[11px] font-semibold text-slate-400">Assignment is locked after creation.</p>}</div>
        <div><label className="label">Start time</label><input type="time" value={form.startTime ?? ''} onChange={(event) => set('startTime', event.target.value)} className="input" /></div>
        <div><label className="label">End time</label><input type="time" value={form.endTime ?? ''} onChange={(event) => set('endTime', event.target.value)} className="input" /></div>
      </div>
      <div><label className="label">Study goal</label><input value={form.studyGoal ?? ''} onChange={(event) => set('studyGoal', event.target.value)} className="input" placeholder="Solve five practice questions" /></div>
      <div><label className="label">Notes</label><textarea value={form.notes ?? ''} onChange={(event) => set('notes', event.target.value)} className="input min-h-20 resize-none" placeholder="What would make this session feel successful?" /></div>
      <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button disabled={saving} className="btn-primary">{saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} {session ? 'Save changes' : 'Plan session'}</button></div>
    </form>
  </Modal>
}
