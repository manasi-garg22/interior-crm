import { z } from 'zod'
import { optionalPhoneSchema, phoneSchema } from './phone'
import {
  contactMethodSchema,
  leadSourceSchema,
  propertyStatusSchema,
  propertyTypeSchema,
} from './enums'

/**
 * The public consultation form.
 *
 * Each step has a bare `*Fields` object so the steps can be composed into one
 * submission schema, plus a `*Schema` that adds any cross-field rule for
 * validating that step on its own. The browser and the server run the
 * identical schema — they cannot disagree about what a valid lead is.
 */

const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value)

const trimmedOptional = z.preprocess(
  emptyToUndefined,
  z.string().trim().max(500).optional(),
)

// ── Step 1: project type ────────────────────────────────────
export const step1Fields = z.object({
  propertyType: propertyTypeSchema,
  propertyTypeOther: trimmedOptional,
})

const requireOtherDescription = (data: {
  propertyType: string
  propertyTypeOther?: string | undefined
}) => data.propertyType !== 'OTHER' || Boolean(data.propertyTypeOther)

export const step1Schema = step1Fields.refine(requireOtherDescription, {
  message: 'Tell us what kind of property this is',
  path: ['propertyTypeOther'],
})

// ── Step 2: property details ────────────────────────────────
export const step2Fields = z.object({
  propertyStatus: propertyStatusSchema,
  locationLine: trimmedOptional,
  city: z.string().trim().min(1, 'City is required').max(80),
  state: trimmedOptional,
  pincode: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'Enter a valid 6-digit PIN code')
      .optional(),
  ),
  areaSqft: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number()
      .int('Area must be a whole number')
      .positive('Area must be greater than zero')
      .max(1_000_000, 'That area looks too large — please check')
      .optional(),
  ),
  floors: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(200).optional()),
  possessionDate: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
})

export const step2Schema = step2Fields

// ── Step 3: interior requirements ───────────────────────────
export const step3Fields = z.object({
  /**
   * OptionValue keys from the SPACE_REQUIREMENT set. Only checked for shape
   * here; the submission service verifies they exist and are active, because
   * the list is admin-editable and a stale client could send a removed key.
   */
  spaceRequirements: z.array(z.string().min(1)).min(1, 'Choose at least one area'),
  spaceOther: trimmedOptional,
  designStyles: z.array(z.string().min(1)).default([]),
})

export const step3Schema = step3Fields

// ── Step 4: budget and timeline ─────────────────────────────
export const step4Fields = z.object({
  budgetKey: z.string().min(1, 'Choose a budget range'),
  timelineKey: z.string().min(1, 'Choose a timeline'),
})

export const step4Schema = step4Fields

// ── Step 5: contact details ─────────────────────────────────
export const step5Fields = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name').max(120, 'That name is too long'),
  phone: phoneSchema,
  whatsappNumber: optionalPhoneSchema,
  /** Optional on purpose — demanding an email costs conversions. */
  email: z.preprocess(
    emptyToUndefined,
    z.email('Enter a valid email address').toLowerCase().optional(),
  ),
  preferredContact: contactMethodSchema.default('PHONE'),
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
})

export const step5Schema = step5Fields

// ── Step 6: optional uploads ────────────────────────────────
export const uploadedDocumentSchema = z.object({
  storageKey: z.string().min(1),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(120),
  sizeBytes: z.number().int().positive(),
})

export const step6Fields = z.object({
  documents: z.array(uploadedDocumentSchema).max(10, 'You can attach up to 10 files').default([]),
})

export const step6Schema = step6Fields

// ── Marketing attribution ───────────────────────────────────
export const attributionFields = z.object({
  source: leadSourceSchema.default('WEBSITE'),
  utmSource: trimmedOptional,
  utmMedium: trimmedOptional,
  utmCampaign: trimmedOptional,
  utmContent: trimmedOptional,
  utmTerm: trimmedOptional,
  referrerUrl: trimmedOptional,
  landingPath: trimmedOptional,
})

// ── Anti-spam ───────────────────────────────────────────────

/**
 * Name of the honeypot input. Part of the form contract, so it lives beside
 * the schema rather than in server-only config — the client has to render an
 * input with exactly this name.
 */
export const HONEYPOT_FIELD_NAME = 'company_website'

export const antiSpamFields = z.object({
  /** Honeypot: must stay empty. Bots fill every field they can see. */
  company_website: z.string().max(0, 'Submission rejected').optional().default(''),
  /** Epoch ms when the form first rendered, for the minimum-duration check. */
  startedAt: z.number().int().positive().optional(),
  turnstileToken: z.string().optional(),
})

/** What the public API route parses. */
export const leadSubmissionSchema = z
  .object({
    ...step1Fields.shape,
    ...step2Fields.shape,
    ...step3Fields.shape,
    ...step4Fields.shape,
    ...step5Fields.shape,
    ...step6Fields.shape,
    ...attributionFields.shape,
    ...antiSpamFields.shape,
  })
  .refine(requireOtherDescription, {
    message: 'Tell us what kind of property this is',
    path: ['propertyTypeOther'],
  })

export type LeadSubmission = z.infer<typeof leadSubmissionSchema>
export type Step1Values = z.infer<typeof step1Fields>
export type Step2Values = z.infer<typeof step2Fields>
export type Step3Values = z.infer<typeof step3Fields>
export type Step4Values = z.infer<typeof step4Fields>
export type Step5Values = z.infer<typeof step5Fields>
export type Step6Values = z.infer<typeof step6Fields>

/** Ordered for the 1─2─3─4─5─6 progress rail. */
export const FORM_STEPS = [
  { index: 1, id: 'project-type', title: 'Project type' },
  { index: 2, id: 'property', title: 'Property details' },
  { index: 3, id: 'requirements', title: 'Requirements' },
  { index: 4, id: 'budget', title: 'Budget & timeline' },
  { index: 5, id: 'contact', title: 'Your details' },
  { index: 6, id: 'uploads', title: 'Attachments' },
] as const

export const TOTAL_FORM_STEPS = FORM_STEPS.length
