import { z } from 'zod'

/** A PDF downloaded from the CRM's cost-estimate tool, recorded against a customer. */
export const quotationItemSchema = z.object({
  roomType: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(200),
  quantity: z.number().positive().max(1_000_000),
  unit: z.string().trim().min(1).max(30),
  price: z.number().min(0).max(1_000_000_000),
})

export const recordQuotationSchema = z.object({
  customerId: z.string().cuid({ message: 'Choose the customer this is for' }),
  kind: z.enum(['estimate', 'bill']),
  clientName: z.string().trim().max(160).optional(),
  /** yyyy-mm-dd as printed on the PDF. */
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  remarks: z.string().max(4000).optional(),
  items: z.array(quotationItemSchema).min(1, 'Add at least one item').max(500),
})

export type RecordQuotationInput = z.infer<typeof recordQuotationSchema>
