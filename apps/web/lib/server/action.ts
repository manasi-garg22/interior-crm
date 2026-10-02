import type { z } from 'zod'
import type { Permission } from '@crm/config'
import { requirePermission, requireUserOrThrow, type SessionUser } from './session'
import { toUserFacingError } from './errors'
import { logger } from './logger'

/**
 * The Server Action wrapper.
 *
 * Every mutation in the CRM goes through this, which is how
 * "authenticate → authorize → validate → execute → translate errors"
 * becomes structural rather than something each action remembers to do.
 *
 * Actions return a result object rather than throwing, because a thrown
 * error in a Server Action reaches the client as an opaque digest with no
 * usable message.
 */

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

const log = logger.child('action')

export function withAction<TSchema extends z.ZodType, TResult>(config: {
  permission?: Permission
  schema: TSchema
  handler: (input: z.infer<TSchema>, user: SessionUser) => Promise<TResult>
}): (rawInput: unknown) => Promise<ActionResult<TResult>> {
  return async function action(rawInput: unknown): Promise<ActionResult<TResult>> {
    try {
      const user = config.permission
        ? await requirePermission(config.permission)
        : await requireUserOrThrow()

      const parsed = config.schema.safeParse(rawInput)
      if (!parsed.success) {
        const fieldErrors: Record<string, string[]> = {}
        for (const issue of parsed.error.issues) {
          const key = issue.path.join('.') || '_'
          ;(fieldErrors[key] ??= []).push(issue.message)
        }
        return { ok: false, error: 'Please check the highlighted fields.', fieldErrors }
      }

      const data = await config.handler(parsed.data as z.infer<TSchema>, user)
      return { ok: true, data }
    } catch (error) {
      const exposed = toUserFacingError(error)

      // Only unexpected faults are worth a stack trace; a 403 is routine.
      if (exposed.status >= 500) {
        log.error('action failed', { error, permission: config.permission })
      }

      return exposed.fieldErrors
        ? { ok: false, error: exposed.message, fieldErrors: exposed.fieldErrors }
        : { ok: false, error: exposed.message }
    }
  }
}
