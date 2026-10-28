'use server'

import { revalidatePath } from 'next/cache'
import { recordQuotationSchema } from '@crm/validation'
import { withAction } from '@/lib/server/action'
import { recordQuotation } from '@/lib/modules/quotation/service'

/** Records a downloaded estimate / bill PDF in the quotation register. */
export const recordQuotationAction = withAction({
  permission: 'lead:create',
  schema: recordQuotationSchema,
  handler: async (input, user) => {
    const saved = await recordQuotation(input, user)
    revalidatePath('/estimates')
    return { id: saved.id }
  },
})
