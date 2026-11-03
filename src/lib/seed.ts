import { addDays, isoDate } from './date'
import type { ActivityLog, Habit, HabitLog, StudySession, Task, UserSettings, WorkspaceData } from '../types'

const now = new Date().toISOString()
const today = isoDate()
const workspaceId = 'local-duoplan-workspace'
const user1Id = 'local-user-1'
const user2Id = 'local-user-2'

export const seedData: WorkspaceData = {
  members: [
    { userId: user1Id, memberNumber: 1, displayName: 'User 1' },
    { userId: user2Id, memberNumber: 2, displayName: 'User 2' },
  ],
  currentMember: { userId: user1Id, memberNumber: 1, displayName: 'User 1' },
  tasks: [
    {
      id: 'task-1', workspaceId, title: 'Revise Java notes', description: 'Finish exception handling examples and flashcards.', taskDate: today, dueTime: '19:00', category: 'Study', priority: 'high', assignedTo: 'surbhi', assignedUserIds: [user1Id], createdBy: user2Id, completions: [{ userId: user1Id, isCompleted: true, completedAt: now }], isCompleted: true, completedAt: now, createdAt: now, updatedAt: now,
    },
    {
      id: 'task-2', workspaceId, title: 'Plan tomorrow together', description: 'Pick the top three priorities for tomorrow morning.', taskDate: today, dueTime: '21:30', category: 'Personal', priority: 'medium', assignedTo: 'both', assignedUserIds: [user1Id, user2Id], createdBy: user1Id, completions: [{ userId: user1Id, isCompleted: false }, { userId: user2Id, isCompleted: false }], isCompleted: false, completedAt: null, createdAt: now, updatedAt: now,
    },
    {
      id: 'task-3', workspaceId, title: '30 minute walk', description: 'A quick reset after the afternoon study block.', taskDate: addDays(today, 1), dueTime: '17:30', category: 'Health & Fitness', priority: 'low', assignedTo: 'aaryan', assignedUserIds: [user2Id], createdBy: user1Id, completions: [{ userId: user2Id, isCompleted: false }], isCompleted: false, completedAt: null, createdAt: now, updatedAt: now,
    },
    {
      id: 'task-4', workspaceId, title: 'Submit project outline', description: 'Upload the outline before college review.', taskDate: addDays(today, 2), dueTime: '11:00', category: 'College', priority: 'high', assignedTo: 'surbhi', assignedUserIds: [user1Id], createdBy: user1Id, completions: [{ userId: user1Id, isCompleted: false }], isCompleted: false, completedAt: null, createdAt: now, updatedAt: now,
    },
  ],
  studySessions: [
    {
      id: 'study-1', workspaceId, subject: 'Java', topic: 'Exception Handling', studyDate: today, startTime: '18:00', endTime: '19:00', plannedMinutes: 60, actualMinutes: 60, assignedTo: 'surbhi', assignedUserIds: [user1Id], createdBy: user1Id, completions: [{ userId: user1Id, isCompleted: true, actualMinutes: 60, completedAt: now }], studyGoal: 'Write three try/catch examples', notes: 'Review checked vs unchecked exceptions.', isCompleted: true, completedAt: now, createdAt: now, updatedAt: now,
    },
    {
      id: 'study-2', workspaceId, subject: 'Data Structures', topic: 'Trees', studyDate: addDays(today, 1), startTime: '09:00', endTime: '10:30', plannedMinutes: 90, actualMinutes: 0, assignedTo: 'both', assignedUserIds: [user1Id, user2Id], createdBy: user2Id, completions: [{ userId: user1Id, isCompleted: false, actualMinutes: 0 }, { userId: user2Id, isCompleted: false, actualMinutes: 0 }], studyGoal: 'Solve five traversal questions', notes: '', isCompleted: false, completedAt: null, createdAt: now, updatedAt: now,
    },
  ],
  habits: [
    { id: 'habit-1', workspaceId, habitName: 'Wake up on time', assignedTo: 'both', frequency: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], createdAt: now },
    { id: 'habit-2', workspaceId, habitName: 'Read for 20 minutes', assignedTo: 'surbhi', frequency: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], createdAt: now },
    { id: 'habit-3', workspaceId, habitName: 'Drink enough water', assignedTo: 'aaryan', frequency: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], createdAt: now },
  ],
  habitLogs: [
    { id: 'log-1', habitId: 'habit-1', userKey: 'surbhi', habitDate: today, isCompleted: true, completedAt: now },
    { id: 'log-2', habitId: 'habit-1', userKey: 'aaryan', habitDate: today, isCompleted: false, completedAt: null },
    { id: 'log-3', habitId: 'habit-2', userKey: 'surbhi', habitDate: today, isCompleted: true, completedAt: now },
  ],
  activityLogs: [
    { id: 'activity-1', workspaceId, actorId: 'surbhi', activityType: 'task_completed', entityId: 'task-1', description: 'completed “Revise Java notes”', createdAt: now },
    { id: 'activity-2', workspaceId, actorId: 'aaryan', activityType: 'study_added', entityId: 'study-2', description: 'added a shared study session for Trees', createdAt: new Date(Date.now() - 45 * 60000).toISOString() },
    { id: 'activity-3', workspaceId, actorId: 'surbhi', activityType: 'task_added', entityId: 'task-2', description: 'created “Plan tomorrow together”', createdAt: new Date(Date.now() - 90 * 60000).toISOString() },
  ],
  settings: [
    { id: 'settings-user-1', userKey: 'surbhi', dailyStudyGoalMinutes: 120, theme: 'light' },
    { id: 'settings-user-2', userKey: 'aaryan', dailyStudyGoalMinutes: 120, theme: 'light' },
  ],
}
