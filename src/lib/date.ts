export const TIME_ZONE = 'Asia/Kolkata'

export function isoDate(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(date)
}

export function formatDate(date: string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: TIME_ZONE,
    month: 'short',
    day: 'numeric',
    ...options,
  }).format(new Date(`${date}T12:00:00`))
}

export function formatLongDate(date: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: TIME_ZONE,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${date}T12:00:00`))
}

export function addDays(date: string, days: number): string {
  const result = new Date(`${date}T12:00:00`)
  result.setDate(result.getDate() + days)
  return result.toISOString().slice(0, 10)
}

export function daysBetween(start: string, end: string): string[] {
  const values: string[] = []
  let current = start
  while (current <= end) {
    values.push(current)
    current = addDays(current, 1)
  }
  return values
}

export function minutesBetween(start?: string, end?: string): number {
  if (!start || !end) return 0
  const [startHour, startMinute] = start.split(':').map(Number)
  const [endHour, endMinute] = end.split(':').map(Number)
  const diff = endHour * 60 + endMinute - (startHour * 60 + startMinute)
  return diff > 0 ? diff : 0
}

export function relativeTime(iso: string): string {
  const delta = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(delta / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
