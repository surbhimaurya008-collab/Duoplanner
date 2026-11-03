export type ViewKey =
  | 'dashboard'
  | 'my-tasks'
  | 'duo-tasks'
  | 'study'
  | 'calendar'
  | 'habits'
  | 'progress'
  | 'activity'
  | 'settings'

export type MemberKey = 'surbhi' | 'aaryan' | 'both'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface Profile {
  id: string
  displayName: string
  roleKey: 'surbhi' | 'aaryan'
  avatarUrl?: string | null
}

export interface WorkspaceMember {
  userId: string
  memberNumber: 1 | 2
  displayName: string
  avatarUrl?: string | null
}

export interface TaskCompletion {
  userId: string
  isCompleted: boolean
  completedAt?: string | null
}

export interface StudyCompletion {
  userId: string
  isCompleted: boolean
  actualMinutes: number
  completedAt?: string | null
}

export interface Task {
  id: string
  workspaceId: string
  title: string
  description?: string
  taskDate: string
  dueTime?: string
  category: string
  priority: TaskPriority
  assignedTo: MemberKey
  assignedUserIds: string[]
  createdBy: string
  completions: TaskCompletion[]
  isCompleted: boolean
  completedAt?: string | null
  createdAt: string
  updatedAt: string
  notes?: string
}

export interface StudySession {
  id: string
  workspaceId: string
  subject: string
  topic: string
  studyDate: string
  startTime?: string
  endTime?: string
  plannedMinutes: number
  actualMinutes: number
  assignedTo: MemberKey
  assignedUserIds: string[]
  createdBy?: string | null
  completions: StudyCompletion[]
  studyGoal?: string
  notes?: string
  isCompleted: boolean
  completedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface Habit {
  id: string
  workspaceId: string
  habitName: string
  assignedTo: MemberKey
  frequency: string[]
  createdAt: string
}

export interface HabitLog {
  id: string
  habitId: string
  userKey: 'surbhi' | 'aaryan'
  habitDate: string
  isCompleted: boolean
  completedAt?: string | null
}

export interface ActivityLog {
  id: string
  workspaceId: string
  actorId: 'surbhi' | 'aaryan'
  activityType: string
  entityId?: string
  description: string
  createdAt: string
}

export interface UserSettings {
  id: string
  userKey: 'surbhi' | 'aaryan'
  dailyStudyGoalMinutes: number
  theme: 'light' | 'dark'
}

export interface WorkspaceData {
  members: WorkspaceMember[]
  currentMember: WorkspaceMember | null
  tasks: Task[]
  studySessions: StudySession[]
  habits: Habit[]
  habitLogs: HabitLog[]
  activityLogs: ActivityLog[]
  settings: UserSettings[]
}

export const memberNames: Record<'surbhi' | 'aaryan', string> = {
  surbhi: 'User 1',
  aaryan: 'User 2',
}

export const categoryMeta: Record<string, { color: string; icon: string }> = {
  Study: { color: '#8b7cf6', icon: '📚' },
  College: { color: '#4f9cf9', icon: '🎓' },
  Work: { color: '#f6a44e', icon: '💼' },
  Personal: { color: '#ea7ca7', icon: '✨' },
  'Health & Fitness': { color: '#36b37e', icon: '🌿' },
  Exercise: { color: '#23a7a0', icon: '🏃' },
  Habits: { color: '#ad7bf5', icon: '🔁' },
  Important: { color: '#ef6c70', icon: '⚡' },
  Other: { color: '#7f8ba4', icon: '🗂️' },
}

export const categories = Object.keys(categoryMeta)
