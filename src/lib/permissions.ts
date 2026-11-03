export function canManageOwnedRecord(createdBy: string | null | undefined, currentUserId?: string) {
  return !currentUserId || createdBy === currentUserId
}

export function canCompleteAssignedRecord(assignedUserIds: string[], currentUserId?: string, authenticatedUserId?: string) {
  return Boolean(currentUserId && assignedUserIds.includes(currentUserId) && (!authenticatedUserId || authenticatedUserId === currentUserId))
}
