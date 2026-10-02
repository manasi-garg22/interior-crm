'use server'

import { revalidatePath } from 'next/cache'
import {
  cancelFollowUpSchema,
  completeFollowUpSchema,
  rescheduleFollowUpSchema,
} from '@crm/validation'
import { withAction } from '@/lib/server/action'
import * as followUps from '@/lib/modules/followup/service'

export const completeFollowUpAction = withAction({
  permission: 'followup:update',
  schema: completeFollowUpSchema,
  handler: async (input, user) => {
    await followUps.complete(input, user)
    revalidatePath('/follow-ups')
    revalidatePath('/dashboard')
    return { followUpId: input.followUpId }
  },
})

export const rescheduleFollowUpAction = withAction({
  permission: 'followup:update',
  schema: rescheduleFollowUpSchema,
  handler: async (input, user) => {
    await followUps.reschedule(input, user)
    revalidatePath('/follow-ups')
    revalidatePath('/dashboard')
    return { followUpId: input.followUpId }
  },
})

export const cancelFollowUpAction = withAction({
  permission: 'followup:update',
  schema: cancelFollowUpSchema,
  handler: async (input, user) => {
    await followUps.cancel(input, user)
    revalidatePath('/follow-ups')
    revalidatePath('/dashboard')
    return { followUpId: input.followUpId }
  },
})
