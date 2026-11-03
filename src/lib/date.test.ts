import { describe, expect, it } from 'vitest'
import { addDays, daysBetween, minutesBetween } from './date'

describe('date helpers', () => {
  it('adds calendar days without changing the date format', () => {
    expect(addDays('2026-10-25', 3)).toBe('2026-10-28')
  })

  it('creates an inclusive planning range', () => {
    expect(daysBetween('2026-10-25', '2026-10-27')).toEqual(['2026-10-25', '2026-10-26', '2026-10-27'])
  })

  it('calculates positive study minutes and ignores reversed times', () => {
    expect(minutesBetween('09:15', '10:45')).toBe(90)
    expect(minutesBetween('10:45', '09:15')).toBe(0)
  })
})
