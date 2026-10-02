import type { Metadata } from 'next'
import Link from 'next/link'
import { getPublicEnv } from '@crm/config'
import { ButtonLink } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Thank you',
  robots: { index: false, follow: false },
}

/**
 * Confirmation screen.
 *
 * Shows only what the customer supplied plus their reference number. No lead
 * score, no temperature, no assigned salesperson — none of that is theirs to
 * see, and the values arrive from the query string, so they could not be
 * trusted for anything anyway.
 */
export default async function ThankYouPage(props: {
  searchParams: Promise<{ ref?: string; name?: string }>
}) {
  const { ref, name } = await props.searchParams
  const env = getPublicEnv()

  const firstName = (name ?? '').trim().split(/\s+/)[0] ?? ''
  const reference = sanitizeReference(ref)

  const whatsappHref = env.companyWhatsApp
    ? `https://wa.me/${env.companyWhatsApp.replace(/\D/g, '')}?text=${encodeURIComponent(
        reference ? `Hi, I just submitted an enquiry (${reference}).` : 'Hi, I just submitted an enquiry.',
      )}`
    : null

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-[84rem] items-center px-5 sm:h-20 sm:px-8">
          <Link href="/" className="font-display text-lg tracking-tight sm:text-xl">
            {env.companyName}
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center px-5 py-16 sm:px-8">
        <div className="mx-auto w-full max-w-xl">
          <div
            aria-hidden
            className="flex size-14 items-center justify-center rounded-full bg-ink text-2xl text-ink-inverse"
          >
            ✓
          </div>

          <h1 className="mt-8 font-display text-[2rem] leading-tight tracking-tight sm:text-hero">
            {firstName ? `Thank you, ${firstName}!` : 'Thank you!'}
          </h1>

          <p className="mt-5 text-lg leading-relaxed text-ink-soft">
            We&rsquo;ve received your project requirements. One of our designers will be in touch
            within one working day.
          </p>

          {reference ? (
            <div className="mt-8 border border-line bg-surface px-5 py-4">
              <p className="eyebrow">Your reference</p>
              <p className="mt-1.5 font-display text-2xl tracking-tight">{reference}</p>
              <p className="mt-2 text-sm text-ink-muted">
                Quote this if you get in touch before we reach you.
              </p>
            </div>
          ) : null}

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            {whatsappHref ? (
              <ButtonLink href={whatsappHref} size="lg" className="w-full sm:w-auto">
                Chat on WhatsApp
              </ButtonLink>
            ) : null}
            {env.companyPhone ? (
              <ButtonLink
                href={`tel:${env.companyPhone}`}
                size="lg"
                variant="secondary"
                className="w-full sm:w-auto"
              >
                Call us
              </ButtonLink>
            ) : null}
          </div>

          <div className="mt-12 border-t border-line pt-6">
            <p className="eyebrow">What happens next</p>
            <ol className="mt-4 space-y-3 text-[0.9375rem] text-ink-soft">
              <li className="flex gap-3">
                <span className="font-display text-accent">01</span>A designer reviews your
                requirements.
              </li>
              <li className="flex gap-3">
                <span className="font-display text-accent">02</span>We call to understand the brief
                properly.
              </li>
              <li className="flex gap-3">
                <span className="font-display text-accent">03</span>We arrange a site visit and
                begin design.
              </li>
            </ol>
          </div>

          <p className="mt-10">
            <Link href="/" className="text-sm text-ink-muted underline underline-offset-4 hover:text-ink">
              Back to homepage
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

/**
 * The reference comes from the query string, so it is attacker-controlled.
 * Rendering it verbatim would allow arbitrary text on a page that looks
 * official; only the exact reference format is echoed back.
 */
function sanitizeReference(value: string | undefined): string | null {
  if (!value) return null
  return /^LEAD-\d{4}-\d{4,10}$/.test(value) ? value : null
}
