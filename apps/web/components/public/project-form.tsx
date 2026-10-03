'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FORM_STEPS,
  HONEYPOT_FIELD_NAME_CLIENT,
  isCommercialPropertyType,
  step1Fields,
  step2Fields,
  step3Fields,
  step4Fields,
  step5Fields,
  type PropertyTypeValue,
} from '@/lib/public-form-contract'
import { Button } from '@/components/ui/button'
import { StepIndicator } from './step-indicator'
import {
  StepBudget,
  StepContact,
  StepProperty,
  StepProjectType,
  StepRequirements,
  StepUploads,
  type PublicOption,
  type FormState,
  type UploadedFile,
} from './form-steps'

const STORAGE_KEY = 'interior-crm:enquiry-draft'

export type ProjectFormOptions = {
  budgetRanges: PublicOption[]
  timelines: PublicOption[]
  designStyles: PublicOption[]
  spaceRequirements: PublicOption[]
}

const EMPTY_STATE: FormState = {
  spaceRequirements: [],
  designStyles: [],
  preferredContact: 'PHONE',
}

type Attribution = Record<string, string | undefined>

export function ProjectForm({ options }: { options: ProjectFormOptions }) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [values, setValues] = useState<FormState>(EMPTY_STATE)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [uploads, setUploads] = useState<UploadedFile[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const attribution = useRef<Attribution>({})
  // Set on mount, not at render time: reading the clock during render is
  // impure and would give an unstable value across re-renders.
  const startedAt = useRef<number>(0)
  const honeypot = useRef<string>('')
  const headingRef = useRef<HTMLHeadingElement>(null)

  /**
   * Capture marketing attribution on first paint, before any navigation can
   * strip the query string, and restore any draft the customer left behind.
   */
  useEffect(() => {
    startedAt.current = Date.now()

    const params = new URLSearchParams(window.location.search)
    attribution.current = {
      utmSource: params.get('utm_source') ?? undefined,
      utmMedium: params.get('utm_medium') ?? undefined,
      utmCampaign: params.get('utm_campaign') ?? undefined,
      utmContent: params.get('utm_content') ?? undefined,
      utmTerm: params.get('utm_term') ?? undefined,
      referrerUrl: document.referrer || undefined,
      landingPath: window.location.pathname,
      source: inferSource(params.get('utm_source'), document.referrer),
    }

    try {
      const saved = window.sessionStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as {
          values: FormState
          step: number
          startedAt?: number
        }
        // Keep the original start time: a restored draft lands on the last
        // step, and restarting the clock made a quick resubmit look like a bot.
        if (typeof parsed.startedAt === 'number' && parsed.startedAt < startedAt.current) {
          startedAt.current = parsed.startedAt
        }
        // Restoring a draft is the textbook "initialise from a browser-only
        // store after mount" case: sessionStorage does not exist during SSR,
        // and seeding it via a lazy useState initialiser would desynchronise
        // the server and client renders. A dropped signal or an accidental
        // back-swipe must not cost the lead.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setValues({ ...EMPTY_STATE, ...parsed.values })
        setStep(Math.min(Math.max(parsed.step, 1), FORM_STEPS.length))
      }
    } catch {
      // A corrupt draft is not worth failing over — start fresh.
    }
  }, [])

  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ values, step, startedAt: startedAt.current }),
      )
    } catch {
      // Private browsing can refuse writes; the form still works.
    }
  }, [values, step])

  // Move focus to the new step heading so the change is announced.
  useEffect(() => {
    headingRef.current?.focus()
  }, [step])

  function patch(update: Partial<FormState>): void {
    setValues((previous) => ({ ...previous, ...update }))
    setErrors((previous) => {
      const next = { ...previous }
      for (const key of Object.keys(update)) delete next[key]
      return next
    })
  }

  function validateStep(target: number): boolean {
    const schema = [step1Fields, step2Fields, step3Fields, step4Fields, step5Fields][target - 1]
    if (!schema) return true

    const result = schema.safeParse(values)
    if (result.success) {
      // Cross-field rule that lives outside the bare field schemas.
      if (target === 1 && values.propertyType === 'OTHER' && !values.propertyTypeOther?.trim()) {
        setErrors({ propertyTypeOther: 'Tell us what kind of property this is' })
        return false
      }
      setErrors({})
      return true
    }

    const collected: Record<string, string> = {}
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? '_')
      collected[key] ??= issue.message
    }
    setErrors(collected)
    return false
  }

  function goNext(): void {
    if (!validateStep(step)) return
    setStep((current) => Math.min(current + 1, FORM_STEPS.length))
  }

  function goBack(): void {
    setErrors({})
    setStep((current) => Math.max(current - 1, 1))
  }

  async function handleSubmit(): Promise<void> {
    // Re-validate every step, not just the last one: a customer can reach
    // step 6 and then clear a field by navigating back.
    for (let target = 1; target <= 5; target += 1) {
      if (!validateStep(target)) {
        setStep(target)
        return
      }
    }

    setSubmitting(true)
    setSubmitError(null)

    try {
      const response = await fetch('/api/public/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          areaSqft: values.areaSqft ? Number(values.areaSqft) : undefined,
          floors: values.floors ? Number(values.floors) : undefined,
          documents: uploads.map((file) => ({
            storageKey: file.storageKey,
            fileName: file.fileName,
            mimeType: file.mimeType,
            sizeBytes: file.sizeBytes,
          })),
          ...attribution.current,
          startedAt: startedAt.current,
          [HONEYPOT_FIELD_NAME_CLIENT]: honeypot.current,
        }),
      })

      const payload = (await response.json()) as {
        leadNumber?: string
        customerName?: string
        error?: string
        fieldErrors?: Record<string, string[]>
      }

      if (!response.ok) {
        if (payload.fieldErrors) setErrors(firstMessagePerField(payload.fieldErrors))
        setSubmitError(payload.error ?? 'Something went wrong. Please try again.')
        return
      }

      clearDraft()

      const query = new URLSearchParams({
        ref: payload.leadNumber ?? '',
        name: payload.customerName ?? '',
      })
      router.push(`/thank-you?${query.toString()}`)
    } catch {
      setSubmitError('We could not reach our servers. Please check your connection and retry.')
    } finally {
      setSubmitting(false)
    }
  }

  const propertyType = values.propertyType as PropertyTypeValue | undefined
  const spaceCategory =
    propertyType && isCommercialPropertyType(propertyType) ? 'commercial' : 'residential'

  const visibleSpaces = options.spaceRequirements.filter(
    (option) => (option.category ?? 'residential') === spaceCategory,
  )

  const isLastStep = step === FORM_STEPS.length

  return (
    <div className="mx-auto w-full max-w-2xl">
      <StepIndicator steps={FORM_STEPS} current={step} />

      <div className="mt-10 sm:mt-12">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-[1.75rem] leading-tight tracking-tight outline-none sm:text-title"
        >
          {HEADINGS[step - 1]?.title}
        </h2>
        <p className="mt-2.5 text-ink-muted">{HEADINGS[step - 1]?.subtitle}</p>
      </div>

      <div className="mt-8 sm:mt-10">
        {step === 1 ? (
          <StepProjectType values={values} errors={errors} onChange={patch} />
        ) : null}
        {step === 2 ? <StepProperty values={values} errors={errors} onChange={patch} /> : null}
        {step === 3 ? (
          <StepRequirements
            values={values}
            errors={errors}
            onChange={patch}
            spaces={visibleSpaces}
            styles={options.designStyles}
          />
        ) : null}
        {step === 4 ? (
          <StepBudget
            values={values}
            errors={errors}
            onChange={patch}
            budgets={options.budgetRanges}
            timelines={options.timelines}
          />
        ) : null}
        {step === 5 ? <StepContact values={values} errors={errors} onChange={patch} /> : null}
        {step === 6 ? <StepUploads uploads={uploads} onChange={setUploads} /> : null}
      </div>

      {/* Honeypot: positioned off-screen rather than display:none, which some
          bots specifically skip. Never announced to assistive technology. */}
      <div aria-hidden className="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden">
        <label htmlFor={HONEYPOT_FIELD_NAME_CLIENT}>Company website</label>
        <input
          id={HONEYPOT_FIELD_NAME_CLIENT}
          name={HONEYPOT_FIELD_NAME_CLIENT}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          onChange={(event) => {
            honeypot.current = event.target.value
          }}
        />
      </div>

      {submitError ? (
        <div
          role="alert"
          className="mt-8 border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          {submitError}
        </div>
      ) : null}

      <div className="mt-10 flex items-center gap-3 border-t border-line pt-6">
        {step > 1 ? (
          <Button variant="secondary" size="lg" onClick={goBack} disabled={submitting}>
            Back
          </Button>
        ) : null}

        <div className="flex-1" />

        {isLastStep ? (
          <Button size="lg" onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? 'Sending…' : 'Submit enquiry'}
          </Button>
        ) : (
          <Button size="lg" onClick={goNext}>
            Continue
          </Button>
        )}
      </div>

      {isLastStep ? (
        <p className="mt-4 text-center text-sm text-ink-muted">
          Attachments are optional — you can submit without them.
        </p>
      ) : null}
    </div>
  )
}

const HEADINGS = [
  { title: 'What are we designing?', subtitle: 'Pick the closest match. You can add detail later.' },
  { title: 'Tell us about the property', subtitle: 'Rough numbers are fine at this stage.' },
  { title: 'What needs work?', subtitle: 'Select everything that applies.' },
  { title: 'Budget and timeline', subtitle: 'This helps us put the right team on your project.' },
  { title: 'How should we reach you?', subtitle: 'A designer will call you, not a call centre.' },
  { title: 'Anything to share?', subtitle: 'Floor plans, photos or inspiration — all optional.' },
]

function firstMessagePerField(fieldErrors: Record<string, string[]>): Record<string, string> {
  const collected: Record<string, string> = {}
  for (const [key, messages] of Object.entries(fieldErrors)) {
    if (messages[0]) collected[key] = messages[0]
  }
  return collected
}

function clearDraft(): void {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}

/** Best-effort channel attribution when no utm_source is present. */
function inferSource(utmSource: string | null, referrer: string): string {
  const candidate = (utmSource ?? '').toLowerCase()
  if (candidate.includes('instagram') || candidate === 'ig') return 'INSTAGRAM'
  if (candidate.includes('facebook') || candidate === 'fb') return 'FACEBOOK'
  if (candidate.includes('google')) return 'GOOGLE'
  if (candidate.includes('whatsapp')) return 'WHATSAPP'
  if (candidate.includes('referral')) return 'REFERRAL'

  const host = referrer ? safeHost(referrer) : ''
  if (host.includes('instagram')) return 'INSTAGRAM'
  if (host.includes('facebook')) return 'FACEBOOK'
  if (host.includes('google')) return 'GOOGLE'
  if (!referrer) return 'DIRECT'

  return 'WEBSITE'
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return ''
  }
}
