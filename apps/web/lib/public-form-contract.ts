/**
 * The slice of @crm/validation that the public form's client bundle needs.
 *
 * Imported through this barrel rather than directly from the package index so
 * the browser bundle cannot accidentally pull in server-only configuration.
 * Zod and libphonenumber-js are both browser-safe; `@crm/config` is not,
 * because it reads process.env.
 */

export {
  FORM_STEPS,
  TOTAL_FORM_STEPS,
  HONEYPOT_FIELD_NAME as HONEYPOT_FIELD_NAME_CLIENT,
  step1Fields,
  step2Fields,
  step3Fields,
  step4Fields,
  step5Fields,
  step6Fields,
  isCommercialPropertyType,
  sanitizePhoneInput,
} from '@crm/validation'

export type { PropertyTypeValue } from '@crm/validation'
