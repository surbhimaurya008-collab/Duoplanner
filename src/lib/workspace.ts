import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, isSupabaseConfigured } from './supabase'
import { seedData } from './seed'
import { isoDate } from './date'
import { canCompleteAssignedRecord, canManageOwnedRecord } from './permissions'
import type { ActivityLog, Habit, HabitLog, MemberKey, StudyCompletion, StudySession, Task, TaskCompletion, UserSettings, WorkspaceData, WorkspaceMember } from '../types'

const LOCAL_KEY = 'duoplan-local-data-v1'
const LOCAL_PROFILE_KEY = 'duoplan-local-profile'
const WORKSPACE_ID = 'local-duoplan-workspace'
const LOCAL_USER_IDS = { surbhi: 'local-user-1', aaryan: 'local-user-2' } as const
type TaskInput = Omit<Task, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt' | 'completions' | 'assignedUserIds' | 'createdBy' | 'isCompleted' | 'completedAt'> & { id?: string; assignedUserIds?: string[]; createdBy?: string; isCompleted?: boolean; completedAt?: string | null }
type StudyInput = Omit<StudySession, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt' | 'completions' | 'assignedUserIds' | 'createdBy' | 'isCompleted' | 'completedAt' | 'actualMinutes'> & { id?: string; assignedUserIds?: string[]; createdBy?: string; isCompleted?: boolean; completedAt?: string | null; actualMinutes?: number }

export function getLocalProfile(): 'surbhi' | 'aaryan' {
  return window.localStorage.getItem(LOCAL_PROFILE_KEY) === 'aaryan' ? 'aaryan' : 'surbhi'
}

export function setLocalProfile(profile: 'surbhi' | 'aaryan') {
  window.localStorage.setItem(LOCAL_PROFILE_KEY, profile)
}

function readLocalData(profile: 'surbhi' | 'aaryan'): WorkspaceData {
  const raw = window.localStorage.getItem(LOCAL_KEY)
  const fallback = structuredClone(seedData)
  fallback.currentMember = fallback.members[profile === 'surbhi' ? 0 : 1]
  if (!raw) return fallback
  try {
    const stored = JSON.parse(raw) as WorkspaceData
    stored.members ??= fallback.members
    stored.currentMember = stored.members[profile === 'surbhi' ? 0 : 1] ?? fallback.currentMember
    return stored
  } catch {
    return fallback
  }
}

function writeLocalData(data: WorkspaceData) {
  window.localStorage.setItem(LOCAL_KEY, JSON.stringify(data))
}

function slotForUser(userId: string, members: WorkspaceMember[]): 'surbhi' | 'aaryan' {
  return members.find((member) => member.userId === userId)?.memberNumber === 2 ? 'aaryan' : 'surbhi'
}

function memberNamesBySlot(members: WorkspaceMember[]): Record<'surbhi' | 'aaryan', string> {
  return {
    surbhi: members.find((member) => member.memberNumber === 1)?.displayName ?? 'User 1',
    aaryan: members.find((member) => member.memberNumber === 2)?.displayName ?? 'User 2',
  }
}

function assignedIdsForSlot(assignedTo: MemberKey, members: WorkspaceMember[], currentUserId?: string): string[] {
  if (assignedTo === 'both') return members.filter((member) => member.memberNumber === 1 || member.memberNumber === 2).map((member) => member.userId)
  const target = assignedTo === 'surbhi' ? members.find((member) => member.memberNumber === 1) : members.find((member) => member.memberNumber === 2)
  return target ? [target.userId] : currentUserId && members.some((member) => member.userId === currentUserId) ? [currentUserId] : []
}

function normalizeCompletions(rows: any[] | undefined, fallbackIds: string[], completionKey: 'task' | 'study'): TaskCompletion[] | StudyCompletion[] {
  return fallbackIds.map((userId) => {
    const row = (rows ?? []).find((candidate) => candidate.user_id === userId)
    if (completionKey === 'study') return { userId, isCompleted: Boolean(row?.is_completed), actualMinutes: row?.actual_minutes ?? 0, completedAt: row?.completed_at ?? null } as StudyCompletion
    return { userId, isCompleted: Boolean(row?.is_completed), completedAt: row?.completed_at ?? null } as TaskCompletion
  })
}

function taskIsComplete(completions: TaskCompletion[]) {
  return completions.length > 0 && completions.every((completion) => completion.isCompleted)
}

function studyIsComplete(completions: StudyCompletion[]) {
  return completions.length > 0 && completions.every((completion) => completion.isCompleted)
}

function mapTask(row: any, members: WorkspaceMember[]): Task {
  const assignedUserIds = (row.assigned_user_ids ?? []) as string[]
  const completions = normalizeCompletions(row.task_completions, assignedUserIds, 'task') as TaskCompletion[]
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    title: row.title,
    description: row.description ?? '',
    taskDate: row.task_date,
    dueTime: row.due_time ?? '',
    category: row.category,
    priority: row.priority,
    assignedTo: assignedUserIds.length > 1 ? 'both' : slotForUser(assignedUserIds[0] ?? '', members),
    assignedUserIds,
    createdBy: row.created_by,
    completions,
    isCompleted: taskIsComplete(completions),
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    notes: row.notes ?? '',
  }
}

function mapStudy(row: any, members: WorkspaceMember[]): StudySession {
  const assignedUserIds = (row.assigned_user_ids ?? []) as string[]
  const completions = normalizeCompletions(row.study_completions, assignedUserIds, 'study') as StudyCompletion[]
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    subject: row.subject,
    topic: row.topic,
    studyDate: row.study_date,
    startTime: row.start_time ?? '',
    endTime: row.end_time ?? '',
    plannedMinutes: row.planned_minutes ?? 0,
    actualMinutes: completions.reduce((total, completion) => total + completion.actualMinutes, 0),
    assignedTo: assignedUserIds.length > 1 ? 'both' : slotForUser(assignedUserIds[0] ?? '', members),
    assignedUserIds,
    createdBy: row.created_by,
    completions,
    studyGoal: row.study_goal ?? '',
    notes: row.notes ?? '',
    isCompleted: studyIsComplete(completions),
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapHabit(row: any): Habit {
  return { id: row.id, workspaceId: row.workspace_id, habitName: row.habit_name, assignedTo: row.assigned_to, frequency: row.frequency ?? [], createdAt: row.created_at }
}

function mapActivity(row: any, members: WorkspaceMember[]): ActivityLog {
  return { id: row.id, workspaceId: row.workspace_id, actorId: slotForUser(row.actor_id, members), activityType: row.activity_type, entityId: row.entity_id, description: row.description, createdAt: row.created_at }
}

function mapSettings(row: any, members: WorkspaceMember[]): UserSettings {
  return { id: row.id, userKey: slotForUser(row.user_id, members), dailyStudyGoalMinutes: row.daily_study_goal_minutes ?? 120, theme: row.theme ?? 'light' }
}

export function useWorkspaceData(authUserId?: string, localProfile: 'surbhi' | 'aaryan' = getLocalProfile(), localMode = false) {
  const [data, setData] = useState<WorkspaceData>(() => readLocalData(localProfile))
  const [loading, setLoading] = useState(isSupabaseConfigured && !localMode)
  const [error, setError] = useState<string | null>(null)
  const [workspaceId, setWorkspaceId] = useState(WORKSPACE_ID)
  const [hasWorkspace, setHasWorkspace] = useState(!isSupabaseConfigured || localMode)

  const refresh = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured || !authUserId || localMode) {
      setData(readLocalData(localProfile))
      setLoading(false)
      setHasWorkspace(true)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const membershipsResult = await supabase.from('workspace_members').select('workspace_id,user_id,member_number').order('member_number')
      if (membershipsResult.error) throw membershipsResult.error
      const memberships = membershipsResult.data ?? []
      if (!memberships.length) {
        setHasWorkspace(false)
        setData({ members: [], currentMember: null, tasks: [], studySessions: [], habits: [], habitLogs: [], activityLogs: [], settings: [] })
        setLoading(false)
        return
      }
      const id = memberships[0].workspace_id as string
      const userIds = memberships.map((membership: any) => membership.user_id as string)
      const profilesResult = await supabase.from('profiles').select('id,display_name,avatar_url').in('id', userIds)
      if (profilesResult.error) throw profilesResult.error
      const profileById = Object.fromEntries((profilesResult.data ?? []).map((profile: any) => [profile.id, profile]))
      const members: WorkspaceMember[] = memberships.map((membership: any) => ({ userId: membership.user_id, memberNumber: membership.member_number, displayName: profileById[membership.user_id]?.display_name ?? `User ${membership.member_number}`, avatarUrl: profileById[membership.user_id]?.avatar_url ?? null }))
      const currentMember = members.find((member) => member.userId === authUserId) ?? null
      setWorkspaceId(id)
      setHasWorkspace(Boolean(currentMember))
      if (!currentMember) throw new Error('Your account is not a member of this workspace.')

      const [tasks, studies, habits, logs, activities, settings] = await Promise.all([
        supabase.from('tasks').select('*, task_completions(*)').eq('workspace_id', id).order('task_date').order('due_time'),
        supabase.from('study_sessions').select('*, study_completions(*)').eq('workspace_id', id).order('study_date').order('start_time'),
        supabase.from('habits').select('*').eq('workspace_id', id).order('created_at'),
        supabase.from('habit_logs').select('*').eq('habit_date', isoDate()),
        supabase.from('activity_logs').select('*').eq('workspace_id', id).order('created_at', { ascending: false }).limit(80),
        supabase.from('user_settings').select('*'),
      ])
      const firstError = [tasks, studies, habits, logs, activities, settings].find((result) => result.error)?.error
      if (firstError) throw firstError
      setData({
        members,
        currentMember,
        tasks: (tasks.data ?? []).map((row: any) => mapTask(row, members)),
        studySessions: (studies.data ?? []).map((row: any) => mapStudy(row, members)),
        habits: (habits.data ?? []).map(mapHabit),
        habitLogs: (logs.data ?? []).map((row: any): HabitLog => ({ id: row.id, habitId: row.habit_id, userKey: slotForUser(row.user_id ?? row.user_key, members), habitDate: row.habit_date, isCompleted: row.is_completed, completedAt: row.completed_at })),
        activityLogs: (activities.data ?? []).map((row: any) => mapActivity(row, members)),
        settings: (settings.data ?? []).map((row: any) => mapSettings(row, members)),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load the workspace.')
    } finally {
      setLoading(false)
    }
  }, [authUserId, localMode, localProfile])

  useEffect(() => { void refresh() }, [refresh])

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured || localMode || !workspaceId || workspaceId === WORKSPACE_ID) return
    const client = supabase
    const channel = client.channel(`duoplan-${workspaceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `workspace_id=eq.${workspaceId}` }, () => void refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_completions' }, () => void refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'study_sessions', filter: `workspace_id=eq.${workspaceId}` }, () => void refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'study_completions' }, () => void refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs', filter: `workspace_id=eq.${workspaceId}` }, () => void refresh())
      .subscribe()
    return () => { void client.removeChannel(channel) }
  }, [localMode, refresh, workspaceId])

  const mutate = useCallback(async (next: WorkspaceData) => {
    setData(next)
    if (!isSupabaseConfigured || localMode) writeLocalData(next)
  }, [localMode])

  const addActivity = useCallback((next: WorkspaceData, activity: Omit<ActivityLog, 'id' | 'createdAt' | 'workspaceId'>) => {
    const item: ActivityLog = { ...activity, id: crypto.randomUUID(), workspaceId, createdAt: new Date().toISOString() }
    return { ...next, activityLogs: [item, ...next.activityLogs].slice(0, 100) }
  }, [workspaceId])

  const persistActivity = useCallback(async (activity: ActivityLog) => {
    if (!supabase || !isSupabaseConfigured || !authUserId || localMode || workspaceId === WORKSPACE_ID) return
    const { error: activityError } = await supabase.from('activity_logs').insert({ workspace_id: activity.workspaceId, actor_id: authUserId, activity_type: activity.activityType, entity_id: activity.entityId, description: activity.description })
    if (activityError) setError(activityError.message)
  }, [authUserId, localMode, workspaceId])

  const currentMember = data.currentMember ?? (localProfile === 'surbhi' ? data.members[0] : data.members[1])
  const members = data.members
  const remoteEnabled = Boolean(supabase && isSupabaseConfigured && !localMode && authUserId && hasWorkspace && currentMember?.userId === authUserId && workspaceId !== WORKSPACE_ID)
  const remoteClient = remoteEnabled && supabase ? supabase : null

  const upsertTask = useCallback(async (task: TaskInput) => {
    if (!currentMember) return
    const now = new Date().toISOString()
    const existing = task.id ? data.tasks.find((item) => item.id === task.id) : undefined
    const assignedUserIds = task.assignedUserIds?.length ? task.assignedUserIds : assignedIdsForSlot(task.assignedTo, members, currentMember.userId)
    if (assignedUserIds.length < 1 || assignedUserIds.length > 2) { setError('Choose an assignment belonging to a workspace member.'); return }
    const completions = existing?.completions ?? assignedUserIds.map((userId) => ({ userId, isCompleted: false }))
    const nextTask: Task = { ...task, id: task.id ?? crypto.randomUUID(), workspaceId, assignedUserIds, createdBy: existing?.createdBy ?? authUserId ?? currentMember.userId, completions, isCompleted: taskIsComplete(completions), completedAt: taskIsComplete(completions) ? now : null, createdAt: existing?.createdAt ?? now, updatedAt: now }
    const next = { ...data, tasks: existing ? data.tasks.map((item) => item.id === nextTask.id ? nextTask : item) : [nextTask, ...data.tasks] }
    const withActivity = addActivity(next, { actorId: slotForUser(currentMember.userId, members), activityType: existing ? 'task_updated' : 'task_added', entityId: nextTask.id, description: existing ? `updated “${nextTask.title}”` : `created “${nextTask.title}”` })
    await mutate(withActivity)
    await persistActivity(withActivity.activityLogs[0])
    if (remoteClient) {
      const payload = { id: nextTask.id, workspace_id: workspaceId, title: nextTask.title, description: nextTask.description, task_date: nextTask.taskDate, due_time: nextTask.dueTime || null, category: nextTask.category, priority: nextTask.priority, assigned_to: nextTask.assignedTo, assigned_user_ids: assignedUserIds, created_by: existing?.createdBy ?? authUserId, notes: nextTask.notes }
      const result = existing ? await remoteClient.from('tasks').update(payload).eq('id', nextTask.id) : await remoteClient.from('tasks').insert(payload)
      if (result.error) { setError(result.error.message); await refresh() }
    }
    return nextTask
  }, [addActivity, authUserId, currentMember, data, members, mutate, persistActivity, refresh, remoteClient, workspaceId])

  const toggleTask = useCallback(async (id: string, userId = currentMember?.userId) => {
    const current = data.tasks.find((task) => task.id === id)
    if (!current || !canCompleteAssignedRecord(current.assignedUserIds, userId, authUserId)) {
      setError('You can only complete tasks assigned to your account.')
      return
    }
    const previous = current.completions.find((completion) => completion.userId === userId)
    const nextCompletions = current.completions.map((completion) => completion.userId === userId ? { ...completion, isCompleted: !completion.isCompleted, completedAt: !completion.isCompleted ? new Date().toISOString() : null } : completion)
    const nextTask = { ...current, completions: nextCompletions, isCompleted: taskIsComplete(nextCompletions), completedAt: taskIsComplete(nextCompletions) ? new Date().toISOString() : null, updatedAt: new Date().toISOString() }
    await mutate({ ...data, tasks: data.tasks.map((task) => task.id === id ? nextTask : task) })
    if (remoteClient) {
      const result = await remoteClient.from('task_completions').upsert({ task_id: id, user_id: userId, is_completed: !previous?.isCompleted, completed_at: !previous?.isCompleted ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
      if (result.error) { setError(result.error.message); await refresh() }
    }
  }, [authUserId, currentMember?.userId, data, mutate, refresh, remoteClient])

  const deleteTask = useCallback(async (id: string) => {
    const task = data.tasks.find((item) => item.id === id)
    if (!task) return
    if (!canManageOwnedRecord(task.createdBy, authUserId ?? currentMember?.userId)) { setError('Only the task creator can edit or delete this task.'); return }
    const next = { ...data, tasks: data.tasks.filter((item) => item.id !== id) }
    const withActivity = addActivity(next, { actorId: slotForUser(currentMember?.userId ?? '', members), activityType: 'task_deleted', entityId: id, description: `deleted “${task.title}”` })
    await mutate(withActivity)
    await persistActivity(withActivity.activityLogs[0])
    if (remoteClient) { const result = await remoteClient.from('tasks').delete().eq('id', id); if (result.error) { setError(result.error.message); await refresh() } }
  }, [addActivity, authUserId, currentMember?.userId, data, members, mutate, persistActivity, refresh, remoteClient])

  const upsertStudy = useCallback(async (session: StudyInput) => {
    if (!currentMember) return
    const now = new Date().toISOString()
    const existing = session.id ? data.studySessions.find((item) => item.id === session.id) : undefined
    const assignedUserIds = session.assignedUserIds?.length ? session.assignedUserIds : assignedIdsForSlot(session.assignedTo, members, currentMember.userId)
    if (assignedUserIds.length < 1 || assignedUserIds.length > 2) { setError('Choose an assignment belonging to a workspace member.'); return }
    const completions = existing?.completions ?? assignedUserIds.map((userId) => ({ userId, isCompleted: false, actualMinutes: 0 }))
    const nextSession: StudySession = { ...session, id: session.id ?? crypto.randomUUID(), workspaceId, assignedUserIds, createdBy: existing?.createdBy ?? authUserId ?? currentMember.userId, completions, actualMinutes: completions.reduce((total, completion) => total + completion.actualMinutes, 0), isCompleted: studyIsComplete(completions), completedAt: studyIsComplete(completions) ? now : null, createdAt: existing?.createdAt ?? now, updatedAt: now }
    const next = { ...data, studySessions: existing ? data.studySessions.map((item) => item.id === nextSession.id ? nextSession : item) : [nextSession, ...data.studySessions] }
    const withActivity = addActivity(next, { actorId: slotForUser(currentMember.userId, members), activityType: existing ? 'study_updated' : 'study_added', entityId: nextSession.id, description: existing ? `updated ${nextSession.subject} study session` : `added a ${nextSession.subject} study session` })
    await mutate(withActivity)
    await persistActivity(withActivity.activityLogs[0])
    if (remoteClient) {
      const payload = { id: nextSession.id, workspace_id: workspaceId, subject: nextSession.subject, topic: nextSession.topic, study_date: nextSession.studyDate, start_time: nextSession.startTime || null, end_time: nextSession.endTime || null, planned_minutes: nextSession.plannedMinutes, assigned_to: nextSession.assignedTo, assigned_user_ids: assignedUserIds, study_goal: nextSession.studyGoal, notes: nextSession.notes, created_by: existing?.createdBy ?? authUserId }
      const result = existing ? await remoteClient.from('study_sessions').update(payload).eq('id', nextSession.id) : await remoteClient.from('study_sessions').insert(payload)
      if (result.error) { setError(result.error.message); await refresh() }
    }
    return nextSession
  }, [addActivity, authUserId, currentMember, data, members, mutate, persistActivity, refresh, remoteClient, workspaceId])

  const toggleStudy = useCallback(async (id: string, userId = currentMember?.userId) => {
    const session = data.studySessions.find((item) => item.id === id)
    if (!session || !canCompleteAssignedRecord(session.assignedUserIds, userId, authUserId)) { setError('You can only complete study sessions assigned to your account.'); return }
    const previous = session.completions.find((completion) => completion.userId === userId)
    const nextCompleted = !previous?.isCompleted
    const nextCompletions = session.completions.map((completion) => completion.userId === userId ? { ...completion, isCompleted: nextCompleted, actualMinutes: nextCompleted ? Math.max(completion.actualMinutes, session.plannedMinutes) : completion.actualMinutes, completedAt: nextCompleted ? new Date().toISOString() : null } : completion)
    const nextSession = { ...session, completions: nextCompletions, actualMinutes: nextCompletions.reduce((total, completion) => total + completion.actualMinutes, 0), isCompleted: studyIsComplete(nextCompletions), completedAt: studyIsComplete(nextCompletions) ? new Date().toISOString() : null, updatedAt: new Date().toISOString() }
    await mutate({ ...data, studySessions: data.studySessions.map((item) => item.id === id ? nextSession : item) })
    if (remoteClient) {
      const result = await remoteClient.from('study_completions').upsert({ study_session_id: id, user_id: userId, is_completed: nextCompleted, actual_minutes: nextCompletions.find((completion) => completion.userId === userId)?.actualMinutes ?? 0, completed_at: nextCompleted ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
      if (result.error) { setError(result.error.message); await refresh() }
    }
  }, [authUserId, currentMember?.userId, data, mutate, refresh, remoteClient])

  const upsertHabit = useCallback(async (habit: Omit<Habit, 'id' | 'workspaceId' | 'createdAt'> & { id?: string }) => {
    const now = new Date().toISOString()
    const existing = habit.id ? data.habits.find((item) => item.id === habit.id) : undefined
    const nextHabit: Habit = { ...habit, id: habit.id ?? crypto.randomUUID(), workspaceId, createdAt: existing?.createdAt ?? now }
    const next = { ...data, habits: existing ? data.habits.map((item) => item.id === nextHabit.id ? nextHabit : item) : [nextHabit, ...data.habits] }
    const withActivity = addActivity(next, { actorId: slotForUser(currentMember?.userId ?? '', members), activityType: 'habit_added', entityId: nextHabit.id, description: `added the habit “${nextHabit.habitName}”` })
    await mutate(withActivity)
    await persistActivity(withActivity.activityLogs[0])
    if (remoteClient) { const result = await remoteClient.from('habits').upsert({ id: nextHabit.id, workspace_id: workspaceId, habit_name: nextHabit.habitName, assigned_to: nextHabit.assignedTo, frequency: nextHabit.frequency }); if (result.error) { setError(result.error.message); await refresh() } }
    return nextHabit
  }, [addActivity, currentMember?.userId, data, members, mutate, persistActivity, refresh, remoteClient, workspaceId])

  const toggleHabit = useCallback(async (habitId: string, userKey: 'surbhi' | 'aaryan', date = isoDate()) => {
    const userId = members.find((member) => member.memberNumber === (userKey === 'surbhi' ? 1 : 2))?.userId ?? currentMember?.userId
    if (!userId || (authUserId && userId !== authUserId)) { setError('You can only update habits for your own account.'); return }
    const current = data.habitLogs.find((log) => log.habitId === habitId && log.userKey === userKey && log.habitDate === date)
    const nextLog: HabitLog = { id: current?.id ?? crypto.randomUUID(), habitId, userKey, habitDate: date, isCompleted: !current?.isCompleted, completedAt: !current?.isCompleted ? new Date().toISOString() : null }
    const next = { ...data, habitLogs: current ? data.habitLogs.map((log) => log.id === current.id ? nextLog : log) : [nextLog, ...data.habitLogs] }
    const withActivity = addActivity(next, { actorId: slotForUser(currentMember?.userId ?? '', members), activityType: 'habit_toggled', entityId: habitId, description: `${nextLog.isCompleted ? 'completed' : 'unchecked'} a daily habit` })
    await mutate(withActivity)
    await persistActivity(withActivity.activityLogs[0])
    if (remoteClient) { const result = await remoteClient.from('habit_logs').upsert({ id: nextLog.id, habit_id: habitId, user_id: userId, user_key: userKey, habit_date: date, is_completed: nextLog.isCompleted, completed_at: nextLog.completedAt }); if (result.error) { setError(result.error.message); await refresh() } }
  }, [addActivity, authUserId, currentMember?.userId, data, members, mutate, persistActivity, refresh, remoteClient])

  const updateSettings = useCallback(async (userKey: 'surbhi' | 'aaryan', values: Partial<UserSettings>) => {
    const next = { ...data, settings: data.settings.map((setting) => setting.userKey === userKey ? { ...setting, ...values } : setting) }
    await mutate(next)
    if (remoteClient) { const result = await remoteClient.from('user_settings').upsert({ user_id: authUserId, daily_study_goal_minutes: next.settings.find((item) => item.userKey === userKey)?.dailyStudyGoalMinutes, theme: next.settings.find((item) => item.userKey === userKey)?.theme }); if (result.error) setError(result.error.message) }
  }, [authUserId, data, mutate, remoteClient])

  const createWorkspace = useCallback(async (name: string) => {
    if (!supabase || !isSupabaseConfigured || !authUserId) return
    const { data: workspace, error: workspaceError } = await supabase.from('workspaces').insert({ workspace_name: name.trim() || 'User 1 & User 2', created_by: authUserId }).select('id').single()
    if (workspaceError) throw workspaceError
    const { error: memberError } = await supabase.from('workspace_members').insert({ workspace_id: workspace.id, user_id: authUserId, role: 'owner', member_number: 1 })
    if (memberError) throw memberError
    await refresh()
  }, [authUserId, refresh])

  const createInvitation = useCallback(async (email: string) => {
    if (!supabase || !isSupabaseConfigured) throw new Error('Supabase is not configured.')
    const { data: token, error: inviteError } = await supabase.rpc('create_workspace_invitation', { target_workspace_id: workspaceId, target_email: email.trim() })
    if (inviteError) throw inviteError
    return `${window.location.origin}/?invite=${token}`
  }, [workspaceId])

  const acceptInvitation = useCallback(async (token: string) => {
    if (!supabase || !isSupabaseConfigured) throw new Error('Supabase is not configured.')
    const { error: acceptError } = await supabase.rpc('accept_workspace_invitation', { invite_token: token })
    if (acceptError) throw acceptError
    await refresh()
  }, [refresh])

  const value = useMemo(() => ({ data, members, currentMember, loading, error, refresh, hasWorkspace, workspaceId, memberNames: memberNamesBySlot(members), createWorkspace, createInvitation, acceptInvitation, upsertTask, toggleTask, deleteTask, upsertStudy, toggleStudy, upsertHabit, toggleHabit, updateSettings, isSupabaseConfigured }), [acceptInvitation, createInvitation, createWorkspace, currentMember, data, deleteTask, error, hasWorkspace, loading, members, refresh, toggleHabit, toggleStudy, toggleTask, updateSettings, upsertHabit, upsertStudy, upsertTask, workspaceId])
  return value
}
