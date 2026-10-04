import { z } from 'zod'

/**
 * Zod mirrors of the Prisma enums.
 *
 * Declared here rather than imported from @crm/database so that the
 * validation package stays usable in the browser bundle — pulling in Prisma
 * would drag the query engine along with it. `tests/unit/enum-parity.test.ts`
 * asserts these stay in step with the schema.
 */

export const propertyTypeSchema = z.enum([
  'RESIDENTIAL',
  'OFFICE',
  'RESTAURANT',
  'CAFE',
  'RETAIL',
  'HOTEL',
  'COMMERCIAL',
  'OTHER',
])
export type PropertyTypeValue = z.infer<typeof propertyTypeSchema>

export const propertyStatusSchema = z.enum([
  'NEW_PROPERTY',
  'UNDER_CONSTRUCTION',
  'READY_TO_MOVE',
  'EXISTING_SPACE',
  'RENOVATION',
])

export const contactMethodSchema = z.enum(['PHONE', 'WHATSAPP', 'EMAIL'])

export const leadSourceSchema = z.enum([
  'INSTAGRAM',
  'FACEBOOK',
  'GOOGLE',
  'WEBSITE',
  'WHATSAPP',
  'REFERRAL',
  'DIRECT',
  'OTHER',
])

export const leadStatusSchema = z.enum([
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'CONSULTATION',
  'SITE_VISIT',
  'QUOTATION',
  'DESIGN',
  'NEGOTIATION',
  'WON',
  'LOST',
  'ON_HOLD',
])
export type LeadStatusValue = z.infer<typeof leadStatusSchema>

export const leadTemperatureSchema = z.enum(['HOT', 'WARM', 'COLD'])

export const roleSchema = z.enum([
  'SUPER_ADMIN',
  'ADMIN',
  'SALES_MANAGER',
  'SALES_EXECUTIVE',
  'DESIGNER',
  'VIEWER',
])
export type RoleValue = z.infer<typeof roleSchema>

export const documentCategorySchema = z.enum([
  'FLOOR_PLAN',
  'PROPERTY_PHOTO',
  'INSPIRATION',
  'EXISTING_DESIGN',
  'QUOTATION',
  'CONTRACT',
  'OTHER',
])

export const followUpTypeSchema = z.enum(['CALL', 'WHATSAPP', 'EMAIL', 'MEETING', 'SITE_VISIT'])

/**
 * Commercial property types score higher and drive which space list the form
 * shows. Kept next to the enum so the two cannot drift.
 */
export const COMMERCIAL_PROPERTY_TYPES: readonly PropertyTypeValue[] = [
  'OFFICE',
  'RESTAURANT',
  'CAFE',
  'RETAIL',
  'HOTEL',
  'COMMERCIAL',
]

export function isCommercialPropertyType(value: PropertyTypeValue): boolean {
  return COMMERCIAL_PROPERTY_TYPES.includes(value)
}
