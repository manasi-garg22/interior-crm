import type { Metadata } from 'next'
import { getPublicEnv } from '@crm/config'
import { ButtonLink } from '@/components/ui/button'
import { Photo } from '@/components/public/photo'
import { SiteHeader } from '@/components/public/site-header'
import { SiteFooter } from '@/components/public/site-footer'
import { RevealObserver } from '@/components/public/reveal-observer'
import { CountUp } from '@/components/public/count-up'
import { InstagramIcon, YouTubeIcon } from '@/components/public/social-icons'

export const metadata: Metadata = {
  title: 'Interior Design & Construction in Vadodara',
  description:
    'OM Arch Designs (OMA Designs) — considered interiors for homes, offices, restaurants and retail in Vadodara, Gujarat. Design, execution and handover under one roof.',
}

// Sample photography until the studio's own project photos are in.
const WORK = [
  { title: 'Four-bedroom residence', place: 'Alkapuri', src: '/images/residence.jpg', span: 'lg:col-span-2' },
  { title: 'Specialty café', place: 'Race Course', src: '/images/cafe.jpg', span: '' },
  { title: 'Design studio office', place: 'Gotri', src: '/images/office.jpg', span: '' },
  { title: 'Apartment renovation', place: 'Vasna-Bhayli', src: '/images/apartment.jpg', span: '' },
  { title: 'Flagship retail', place: 'Akota', src: '/images/retail.jpg', span: '' },
]

const SERVICES = [
  {
    title: 'Residential',
    copy: 'Full homes and single rooms — living, kitchen, bedrooms, wardrobes and modular joinery.',
    items: ['Complete home interiors', 'Modular kitchens', 'Wardrobes & storage', 'Renovation'],
    src: '/images/kitchen.jpg',
  },
  {
    title: 'Commercial',
    copy: 'Workplaces and hospitality built to trade — offices, cafés, restaurants, retail and hotels.',
    items: ['Office & workspace', 'Restaurants & cafés', 'Retail & showroom', 'Hospitality'],
    src: '/images/commercial.jpg',
  },
]

const PROCESS = [
  { step: '01', title: 'Consultation', copy: 'We listen to how you live or trade, and what the space has to do.' },
  { step: '02', title: 'Site visit', copy: 'Measurements, services, structure and the constraints that shape the design.' },
  { step: '03', title: 'Quotation', copy: 'A clear, line-by-line cost for the scope we agreed on site. No allowances that move later.' },
  { step: '04', title: 'Design', copy: 'Layouts, materials and 3D visuals until the space is right on paper.' },
  { step: '05', title: 'Execution', copy: 'One project manager, scheduled trades, weekly progress you can see.' },
  { step: '06', title: 'Handover', copy: 'Snagging closed, warranties issued, and a space ready to use.' },
]

/** Inline stagger for .reveal / .hero-in elements. */
const delay = (ms: number) => ({ '--delay': `${ms}ms` }) as React.CSSProperties

export default function LandingPage() {
  const env = getPublicEnv()

  return (
    <div className="flex min-h-dvh flex-col">
      <RevealObserver />
      <SiteHeader companyName={env.companyName} />

      <main className="flex-1">
        {/* ── Hero ───────────────────────────────────────── */}
        <section className="mx-auto max-w-[84rem] px-5 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-20 lg:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
            <div>
              <p className="eyebrow hero-in" style={delay(0)}>
                Interior design &amp; construction · Vadodara
              </p>

              <h1 className="mt-5 font-display text-[2.75rem] leading-[1.05] tracking-[-0.025em] sm:text-hero lg:text-display">
                <span className="hero-in block" style={delay(120)}>
                  Spaces made
                </span>
                <span className="hero-in block" style={delay(260)}>
                  to be <em className="not-italic text-accent">lived in.</em>
                </span>
              </h1>

              <p className="hero-in mt-6 max-w-lg text-lg leading-relaxed text-ink-soft" style={delay(420)}>
                We design and build interiors for homes and commercial spaces across Vadodara
                and Gujarat — from a single kitchen to a complete fit-out. One team from first
                sketch to final handover.
              </p>

              <div className="hero-in mt-9 flex flex-col gap-3 sm:flex-row sm:items-center" style={delay(560)}>
                <ButtonLink
                  href="/start-project"
                  size="lg"
                  className="w-full transition-transform hover:-translate-y-0.5 sm:w-auto"
                >
                  Start Your Project
                </ButtonLink>
                <ButtonLink href="#contact" size="lg" variant="secondary" className="w-full sm:w-auto">
                  Talk to Our Team
                </ButtonLink>
              </div>

              <p className="hero-in mt-5 text-sm text-ink-muted" style={delay(680)}>
                Tell us about your space in two minutes. No obligation.
              </p>
            </div>

            <Photo
              src="/images/hero.jpg"
              alt="A sunlit living room with a leather sofa, white lounge chairs and indoor plants"
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="aspect-[4/5] w-full"
              imageClassName="hero-photo"
            />
          </div>
        </section>

        {/* ── Credibility strip ──────────────────────────── */}
        <section className="border-y border-line bg-surface">
          <div className="mx-auto grid max-w-[84rem] grid-cols-1 gap-px bg-line px-0 sm:grid-cols-3">
            <div className="reveal bg-surface px-5 py-8 sm:px-8 sm:py-10">
              <p className="font-display text-3xl tracking-tight sm:text-4xl">
                <CountUp to={500} suffix="+" />
              </p>
              <p className="mt-2 text-sm text-ink-muted">Happy clients</p>
            </div>
            <div className="reveal bg-surface px-5 py-8 sm:px-8 sm:py-10" style={delay(120)}>
              <p className="font-display text-3xl tracking-tight sm:text-4xl">
                <CountUp to={5} suffix=" years" durationMs={900} />
              </p>
              <p className="mt-2 text-sm text-ink-muted">Designing and building spaces</p>
            </div>
            <div className="reveal bg-surface px-5 py-8 sm:px-8 sm:py-10" style={delay(240)}>
              <p className="font-display text-3xl tracking-tight sm:text-4xl">Vadodara+</p>
              <p className="mt-2 text-sm text-ink-muted">
                Now expanding to more cities — contact us for details
              </p>
            </div>
          </div>
        </section>

        {/* ── Work ───────────────────────────────────────── */}
        <section id="work" className="mx-auto max-w-[84rem] px-5 py-20 sm:px-8 sm:py-28">
          <div className="reveal flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow">Selected work</p>
              <h2 className="mt-4 max-w-xl font-display text-title sm:text-[2.5rem] sm:leading-[1.1]">
                Recent projects
              </h2>
            </div>
            {env.portfolioUrl ? (
              <ButtonLink href={env.portfolioUrl} variant="secondary" target="_blank" rel="noopener noreferrer">
                View full portfolio
              </ButtonLink>
            ) : null}
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {WORK.map((project, index) => (
              <figure
                key={project.title}
                className={`reveal group ${project.span}`}
                style={delay((index % 3) * 120)}
              >
                <Photo src={project.src} alt={`${project.title}, ${project.place}`} className="aspect-[4/3] w-full" />
                <figcaption className="mt-3 flex items-baseline justify-between gap-4">
                  <span className="text-[0.9375rem] font-medium transition-colors group-hover:text-accent">
                    {project.title}
                  </span>
                  <span className="text-sm text-ink-muted">{project.place}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* ── Services ───────────────────────────────────── */}
        <section id="services" className="border-t border-line bg-surface">
          <div className="mx-auto max-w-[84rem] px-5 py-20 sm:px-8 sm:py-28">
            <div className="reveal">
              <p className="eyebrow">What we do</p>
              <h2 className="mt-4 max-w-2xl font-display text-title sm:text-[2.5rem] sm:leading-[1.1]">
                Two kinds of brief, one standard of finish.
              </h2>
            </div>

            <div className="mt-14 grid gap-12 md:grid-cols-2 md:gap-10">
              {SERVICES.map((service, index) => (
                <div key={service.title} className="reveal group" style={delay(index * 150)}>
                  <Photo
                    src={service.src}
                    alt={`${service.title} interiors`}
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="aspect-[16/10] w-full"
                  />
                  <h3 className="mt-6 font-display text-2xl tracking-tight">{service.title}</h3>
                  <p className="mt-3 max-w-md leading-relaxed text-ink-soft">{service.copy}</p>
                  <ul className="mt-5 space-y-2.5">
                    {service.items.map((item) => (
                      <li key={item} className="flex items-baseline gap-3 text-sm text-ink-soft">
                        <span
                          aria-hidden
                          className="h-px w-4 shrink-0 bg-line-strong transition-all duration-500 group-hover:w-6 group-hover:bg-accent"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Process ────────────────────────────────────── */}
        <section id="process" className="mx-auto max-w-[84rem] px-5 py-20 sm:px-8 sm:py-28">
          <div className="reveal">
            <p className="eyebrow">How it works</p>
            <h2 className="mt-4 max-w-2xl font-display text-title sm:text-[2.5rem] sm:leading-[1.1]">
              From first conversation to handover.
            </h2>
          </div>

          <ol className="mt-14 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {PROCESS.map((phase, index) => (
              <li
                key={phase.step}
                className="reveal group relative pt-5"
                style={delay((index % 3) * 110)}
              >
                {/* Rule that fills with the accent colour on hover */}
                <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-line" />
                <span
                  aria-hidden
                  className="absolute left-0 top-0 h-px w-0 bg-accent transition-all duration-700 ease-out-soft group-hover:w-full"
                />
                <p className="font-display text-sm text-accent">{phase.step}</p>
                <h3 className="mt-2 text-lg font-medium">{phase.title}</h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-muted">{phase.copy}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Follow our work ────────────────────────────── */}
        <section className="border-t border-line bg-surface">
          <div className="mx-auto max-w-[84rem] px-5 py-16 sm:px-8 sm:py-20">
            <div className="reveal grid items-center gap-8 md:grid-cols-[1.3fr_1fr]">
              <div>
                <p className="eyebrow">Follow our work</p>
                <h2 className="mt-4 max-w-xl font-display text-title sm:text-[2.25rem] sm:leading-[1.15]">
                  Site walkthroughs, finished spaces and behind-the-scenes.
                </h2>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
                <SocialButton href={env.instagramUrl} label="Instagram" handle="@omarchdesigns">
                  <InstagramIcon />
                </SocialButton>
                <SocialButton href={env.youtubeUrl} label="YouTube" handle="Watch our videos">
                  <YouTubeIcon />
                </SocialButton>
              </div>
            </div>
          </div>
        </section>

        {/* ── Closing CTA ────────────────────────────────── */}
        <section className="border-t border-line bg-ink text-ink-inverse">
          <div className="mx-auto max-w-[84rem] px-5 py-20 sm:px-8 sm:py-28">
            <div className="reveal grid items-center gap-10 lg:grid-cols-[1.2fr_auto]">
              <div>
                <h2 className="max-w-2xl font-display text-[2rem] leading-[1.1] tracking-tight sm:text-[2.75rem]">
                  Tell us about your space.
                </h2>
                <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-inverse/70">
                  Five short steps. You will hear back from a designer, not a call centre.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <ButtonLink
                  href="/start-project"
                  size="lg"
                  variant="inverse"
                  className="transition-transform hover:-translate-y-0.5"
                >
                  Start Your Project
                </ButtonLink>
                {env.companyPhone ? (
                  <a
                    href={`tel:${env.companyPhone}`}
                    className="inline-flex h-14 items-center justify-center rounded-[2px] border border-ink-inverse/25 px-8 text-base font-medium transition-colors hover:bg-ink-inverse/10"
                  >
                    Call {env.companyPhone}
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter
        companyName={env.companyFullName}
        phone={env.companyPhone}
        whatsapp={env.companyWhatsApp}
        email={env.companyEmail}
        address={env.companyAddress}
        portfolioUrl={env.portfolioUrl}
        instagramUrl={env.instagramUrl}
        youtubeUrl={env.youtubeUrl}
      />

      {/* Sticky mobile CTA — most traffic arrives from an Instagram phone. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/95 p-3 backdrop-blur-md sm:hidden">
        <ButtonLink href="/start-project" size="lg" className="w-full">
          Start Your Project
        </ButtonLink>
      </div>
      <div aria-hidden className="h-20 sm:hidden" />
    </div>
  )
}

function SocialButton({
  href,
  label,
  handle,
  children,
}: {
  href: string
  label: string
  handle: string
  children: React.ReactNode
}) {
  if (!href) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} — ${handle} (opens in a new tab)`}
      className="group/social flex items-center gap-3 rounded-[2px] border border-line-strong px-5 py-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-ink hover:bg-ink hover:text-ink-inverse"
    >
      <span className="transition-transform duration-300 group-hover/social:scale-110">{children}</span>
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-ink-muted transition-colors group-hover/social:text-ink-inverse/70">
          {handle}
        </span>
      </span>
    </a>
  )
}
