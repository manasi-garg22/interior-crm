import { z } from 'zod'
import {
  documentCategorySchema,
  followUpTypeSchema,
  leadSourceSchema,
  leadStatusSchema,
  leadTemperatureSchema,
} from './enums'

/** Internal CRM operations, as opposed to the public submission form. */

const cuid = z.string().cuid()

export const changeLeadStatusSchema = z
  .object({
    leadId: cuid,
    status: leadStatusSchema,
    note: z.string().trim().max(1000).optional(),
    lostReason: z.string().trim().max(200).optional(),
  })
  .refine((data) => data.status !== 'LOST' || Boolean(data.lostReason), {
    message: 'Record why this lead was lost',
    path: ['lostReason'],
  })

export const assignLeadSchema = z.object({
  leadId: cuid,
  /** null unassigns. */
  assignedToId: cuid.nullable(),
  note: z.string().trim().max(500).optional(),
})

export const addNoteSchema = z.object({
  leadId: cuid,
  note: z.string().trim().min(1, 'Write something first').max(4000),
})

export const scheduleFollowUpSchema = z.object({
  leadId: cuid,
  assignedToId: cuid,
  type: followUpTypeSchema.default('CALL'),
  scheduledAt: z.coerce.date().refine((date) => date.getTime() > Date.now() - 60_000, {
    message: 'Pick a time in the future',
  }),
  notes: z.string().trim().max(1000).optional(),
})

export const completeFollowUpSchema = z.object({
  followUpId: cuid,
  outcome: z.string().trim().min(1, 'Record what happened').max(1000),
})

export const rescheduleFollowUpSchema = z.object({
  followUpId: cuid,
  scheduledAt: z.coerce.date(),
  notes: z.string().trim().max(1000).optional(),
})

export const cancelFollowUpSchema = z.object({
  followUpId: cuid,
  reason: z.string().trim().max(500).optional(),
})

export const uploadDocumentSchema = z.object({
  leadId: cuid.optional(),
  customerId: cuid.optional(),
  projectId: cuid.optional(),
  category: documentCategorySchema.default('OTHER'),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(120),
  sizeBytes: z.number().int().positive(),
})

export const presignUploadSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(120),
  sizeBytes: z.number().int().positive(),
  scope: z.enum(['lead', 'customer', 'project', 'public-enquiry']),
  scopeId: z.string().max(64).optional(),
})

// ── Leads list: search, filter, sort, paginate ──────────────

export const leadSortFieldSchema = z.enum([
  'createdAt',
  'updatedAt',
  'score',
  'nextFollowUpAt',
  'leadNumber',
])

/**
 * Parsed straight from the URL query string, which is why every field is
 * optional and coerced — the leads view is shareable and bookmarkable.
 */
export const leadFiltersSchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: z.array(leadStatusSchema).optional(),
  temperature: z.array(leadTemperatureSchema).optional(),
  source: z.array(leadSourceSchema).optional(),
  assignedToId: z.string().optional(),
  city: z.string().trim().max(80).optional(),
  budgetKey: z.string().max(60).optional(),
  campaignId: cuid.optional(),
  createdFrom: z.coerce.date().optional(),
  createdTo: z.coerce.date().optional(),
  overdueFollowUp: z.coerce.boolean().optional(),
  sortBy: leadSortFieldSchema.default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
})

export type LeadFilters = z.infer<typeof leadFiltersSchema>

export const createProjectSchema = z.object({
  leadId: cuid,
  name: z.string().trim().min(2, 'Give the project a name').max(160),
  location: z.string().trim().max(200).optional(),
  areaSqft: z.coerce.number().int().positive().optional(),
  estimatedValue: z.coerce.number().nonnegative().optional(),
  startDate: z.coerce.date().optional(),
  expectedCompletion: z.coerce.date().optional(),
  managerId: cuid.optional(),
})
