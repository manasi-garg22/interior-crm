import { after, NextResponse } from 'next/server'
import { getEnv } from '@crm/config'
import { dispatchPending } from '@/lib/events/dispatcher'
import { leadSubmissionSchema } from '@crm/validation'
import { createLeadFromSubmission } from '@/lib/modules/lead/service'
import { clientIpFrom, getRateLimiter, hashIp } from '@/lib/server/rate-limit'
import { checkSubmission } from '@/lib/server/spam'
import { toUserFacingError } from '@/lib/server/errors'
import { logger } from '@/lib/server/logger'

export const dynamic = 'force-dynamic'

/**
 * The one public write endpoint.
 *
 * Shares no code with the CRM read path, so no query-parameter mistake here
 * can ever expose customer data. It returns the lead number and nothing else.
 */

const log = logger.child('api.public.leads')

export async function POST(request: Request): Promise<NextResponse> {
  const env = getEnv()
  const ip = clientIpFrom(request.headers)
  const ipHash = hashIp(ip)

  try {
    // 1. Rate limit before doing any work, keyed on the hashed IP.
    const limit = await getRateLimiter().check(
      `public-lead:${ipHash}`,
      env.PUBLIC_FORM_RATE_LIMIT_PER_HOUR,
      3600,
    )

    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many enquiries from this connection. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
      )
    }

    // 2. Parse the body defensively — this is unauthenticated input.
    const body: unknown = await request.json().catch(() => null)
    if (body === null || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
    }

    const parsed = leadSubmissionSchema.safeParse(body)
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.') || '_'
        ;(fieldErrors[key] ??= []).push(issue.message)
      }
      return NextResponse.json(
        { error: 'Please check the highlighted fields.', fieldErrors },
        { status: 422 },
      )
    }

    // 3. Spam checks: honeypot, timing, CAPTCHA.
    const verdict = await checkSubmission({
      honeypot: parsed.data.company_website,
      startedAt: parsed.data.startedAt,
      turnstileToken: parsed.data.turnstileToken,
      remoteIp: ip,
    })

    if (!verdict.ok) {
      // Deliberately a generic message and a 200-shaped failure would be
      // worse; a bot learns nothing from this, and a real user never sees it.
      log.warn('submission rejected as spam', { reason: verdict.reason })
      return NextResponse.json(
        { error: 'We could not verify this submission. Please try again.' },
        { status: 400 },
      )
    }

    // 4. The transaction.
    const result = await createLeadFromSubmission(parsed.data, {
      ipHash,
      userAgent: request.headers.get('user-agent')?.slice(0, 500) ?? null,
    })

    // 5. Drain the outbox after the response is sent. The customer never
    //    waits on an email provider, and a failure here cannot affect the
    //    201 they already received.
    after(async () => {
      try {
        await dispatchPending()
      } catch (error) {
        log.error('outbox dispatch failed', { error })
      }
    })

    // 6. Return the minimum the thank-you page needs. No internal ids, no
    //    assignee, no score — none of that is the customer's business.
    return NextResponse.json(
      {
        leadNumber: result.leadNumber,
        customerName: result.customerName,
        isExistingCustomer: result.isExistingCustomer,
      },
      { status: 201 },
    )
  } catch (error) {
    const exposed = toUserFacingError(error)
    if (exposed.status >= 500) {
      log.error('lead submission failed', { error })
    }
    return NextResponse.json(
      { error: exposed.message, fieldErrors: exposed.fieldErrors },
      { status: exposed.status },
    )
  }
}

/** The form is same-origin; nothing else needs to POST here. */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
