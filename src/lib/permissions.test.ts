import { describe, expect, it } from 'vitest'
import { canCompleteAssignedRecord, canManageOwnedRecord } from './permissions'

describe('member permissions', () => {
  it('lets only the task creator manage task metadata', () => {
    expect(canManageOwnedRecord('user-1', 'user-1')).toBe(true)
    expect(canManageOwnedRecord('user-1', 'user-2')).toBe(false)
  })

  it('lets a member complete only their assigned portion', () => {
    expect(canCompleteAssignedRecord(['user-1', 'user-2'], 'user-1', 'user-1')).toBe(true)
    expect(canCompleteAssignedRecord(['user-1', 'user-2'], 'user-2', 'user-1')).toBe(false)
    expect(canCompleteAssignedRecord(['user-1'], 'user-2', 'user-2')).toBe(false)
  })
})
