'use server'

import { revalidatePath } from 'next/cache'
import {
  addNoteSchema,
  assignLeadSchema,
  changeLeadStatusSchema,
  scheduleFollowUpSchema,
} from '@crm/validation'
import { withAction } from '@/lib/server/action'
import * as mutations from '@/lib/modules/lead/mutations'

/**
 * Server Actions for the lead detail page.
 *
 * Each is a thin shell: withAction handles authentication, the permission
 * check, Zod validation and error translation, so the body only says what
 * the operation is.
 */

export const changeStatusAction = withAction({
  permission: 'lead:update',
  schema: changeLeadStatusSchema,
  handler: async (input, user) => {
    await mutations.changeStatus(input, user)
    revalidatePath(`/leads/${input.leadId}`)
    revalidatePath('/leads')
    revalidatePath('/dashboard')
    return { leadId: input.leadId }
  },
})

export const assignLeadAction = withAction({
  permission: 'lead:assign',
  schema: assignLeadSchema,
  handler: async (input, user) => {
    await mutations.assignTo(input, user)
    revalidatePath(`/leads/${input.leadId}`)
    revalidatePath('/leads')
    return { leadId: input.leadId }
  },
})

export const addNoteAction = withAction({
  permission: 'lead:update',
  schema: addNoteSchema,
  handler: async (input, user) => {
    await mutations.addNote(input, user)
    revalidatePath(`/leads/${input.leadId}`)
    return { leadId: input.leadId }
  },
})

export const scheduleFollowUpAction = withAction({
  permission: 'followup:create',
  schema: scheduleFollowUpSchema,
  handler: async (input, user) => {
    await mutations.scheduleFollowUp(input, user)
    revalidatePath(`/leads/${input.leadId}`)
    revalidatePath('/follow-ups')
    revalidatePath('/dashboard')
    return { leadId: input.leadId }
  },
})
