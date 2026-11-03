import { describe, expect, it } from 'vitest'
import { isStrongPassword, isValidEmail } from './auth'

describe('auth validation', () => {
  it('accepts valid email addresses and rejects malformed input', () => {
    expect(isValidEmail('person@example.com')).toBe(true)
    expect(isValidEmail(' person@example.com ')).toBe(true)
    expect(isValidEmail('not-an-email')).toBe(false)
    expect(isValidEmail('person@example')).toBe(false)
  })

  it('requires a strong registration password', () => {
    expect(isStrongPassword('Short1')).toBe(false)
    expect(isStrongPassword('alllowercase1')).toBe(false)
    expect(isStrongPassword('NoNumberHere')).toBe(false)
    expect(isStrongPassword('SecurePass1')).toBe(true)
  })
})
