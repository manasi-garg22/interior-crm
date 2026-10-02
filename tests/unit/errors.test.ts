import { describe, expect, it } from 'vitest'
import {
  AppError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  ValidationError,
  toUserFacingError,
} from '../../apps/web/lib/server/errors'

describe('application errors', () => {
  it('maps each code to the right HTTP status', () => {
    expect(new ValidationError('bad').status).toBe(422)
    expect(new ForbiddenError().status).toBe(403)
    expect(new NotFoundError('Lead').status).toBe(404)
    expect(new RateLimitError(60).status).toBe(429)
  })

  it('carries field errors through to the caller', () => {
    const error = new ValidationError('Check the form', { phone: ['Enter a valid phone number'] })
    const exposed = toUserFacingError(error)
    expect(exposed.fieldErrors).toEqual({ phone: ['Enter a valid phone number'] })
  })

  it('never leaks the message of an unexpected fault', () => {
    const leaky = new Error('connect ECONNREFUSED postgresql://user:hunter2@10.0.0.4:5432')
    const exposed = toUserFacingError(leaky)

    expect(exposed.status).toBe(500)
    expect(exposed.message).toBe('Something went wrong on our side. Please try again.')
    expect(exposed.message).not.toContain('hunter2')
  })

  it('withholds the message of an AppError explicitly marked unsafe', () => {
    const internal = new AppError('INTERNAL', 'row 42 of table users is corrupt', {
      safeToExpose: false,
    })
    expect(toUserFacingError(internal).message).not.toContain('users')
  })
})
