import type { Metadata } from 'next'
import { getPublicEnv } from '@crm/config'
import { ButtonLink } from '@/components/ui/button'
import { ImageSlot } from '@/components/public/image-slot'
import { SiteHeader } from '@/components/public/site-header'
import { SiteFooter } from '@/components/public/site-footer'

export const metadata: Metadata = {
  title: 'Interior Design & Construction',
  description:
    'Considered interiors for homes, offices, restaurants and retail. Design, execution and handover under one roof.',
}

const SERVICES = [
  {
    title: 'Residential',
    copy: 'Full homes and single rooms — living, kitchen, bedrooms, wardrobes and modular joinery.',
    items: ['Complete home interiors', 'Modular kitchens', 'Wardrobes & storage', 'Renovation'],
    tone: 'plaster' as const,
  },
  {
    title: 'Commercial',
    copy: 'Workplaces and hospitality built to trade — offices, cafés, restaurants, retail and hotels.',
    items: ['Office & workspace', 'Restaurants & cafés', 'Retail & showroom', 'Hospitality'],
    tone: 'stone' as const,
  },
]

const PROCESS = [
  { step: '01', title: 'Consultation', copy: 'We listen to how you live or trade, and what the space has to do.' },
  { step: '02', title: 'Site visit', copy: 'Measurements, services, structure and the constraints that shape the design.' },
  { step: '03', title: 'Design', copy: 'Layouts, materials and 3D visuals until the space is right on paper.' },
  { step: '04', title: 'Quotation', copy: 'A line-by-line cost against the drawings. No allowances that move later.' },
  { step: '05', title: 'Execution', copy: 'One project manager, scheduled trades, weekly progress you can see.' },
  { step: '06', title: 'Handover', copy: 'Snagging closed, warranties issued, and a space ready to use.' },
]

export default function LandingPage() {
  const env = getPublicEnv()

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader companyName={env.companyName} />

      <main className="flex-1">
        {/* ── Hero ───────────────────────────────────────── */}
        <section className="mx-auto max-w-[84rem] px-5 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-20 lg:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
            <div>
              <p className="eyebrow">Interior design &amp; construction</p>

              <h1 className="mt-5 font-display text-[2.75rem] leading-[1.05] tracking-[-0.025em] sm:text-hero lg:text-display">
                Spaces made
                <br />
                to be lived in.
              </h1>

              <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-soft">
                We design and build interiors for homes and commercial spaces — from a single
                kitchen to a complete fit-out. One team from first sketch to final handover.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <ButtonLink href="/start-project" size="lg" className="w-full sm:w-auto">
                  Start Your Project
                </ButtonLink>
                <ButtonLink
                  href="#contact"
                  size="lg"
                  variant="secondary"
                  className="w-full sm:w-auto"
                >
                  Talk to Our Team
                </ButtonLink>
              </div>

              <p className="mt-5 text-sm text-ink-muted">
                Tell us about your space in two minutes. No obligation.
              </p>
            </div>

            <ImageSlot
              tone="plaster"
              label="Hero — a finished living room in natural daylight"
              className="aspect-[4/5] w-full lg:aspect-[4/5]"
            />
          </div>
        </section>

        {/* ── Credibility strip ──────────────────────────── */}
        <section className="border-y border-line bg-surface">
          <div className="mx-auto grid max-w-[84rem] grid-cols-2 gap-px bg-line px-0 sm:grid-cols-4">
            {[
              { value: '250+', label: 'Projects delivered' },
              { value: '12', label: 'Years in practice' },
              { value: '45 days', label: 'Typical home fit-out' },
              { value: '100%', label: 'On-site supervision' },
            ].map((stat) => (
              <div key={stat.label} className="bg-surface px-5 py-8 sm:px-8 sm:py-10">
                <p className="font-display text-3xl tracking-tight sm:text-4xl">{stat.value}</p>
                <p className="mt-2 text-sm text-ink-muted">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Work ───────────────────────────────────────── */}
        <section id="work" className="mx-auto max-w-[84rem] px-5 py-20 sm:px-8 sm:py-28">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow">Selected work</p>
              <h2 className="mt-4 max-w-xl font-display text-title sm:text-[2.5rem] sm:leading-[1.1]">
                Recent projects
              </h2>
            </div>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: 'Four-bedroom residence', place: 'Whitefield', tone: 'plaster' as const, span: 'lg:col-span-2' },
              { title: 'Specialty café', place: 'Indiranagar', tone: 'clay' as const, span: '' },
              { title: 'Design studio office', place: 'Koramangala', tone: 'stone' as const, span: '' },
              { title: 'Apartment renovation', place: 'HSR Layout', tone: 'plaster' as const, span: '' },
              { title: 'Flagship retail', place: 'MG Road', tone: 'shadow' as const, span: '' },
            ].map((project) => (
              <figure key={project.title} className={project.span}>
                <ImageSlot
                  tone={project.tone}
                  label={`${project.title}, ${project.place}`}
                  className="aspect-[4/3] w-full"
                />
                <figcaption className="mt-3 flex items-baseline justify-between gap-4">
                  <span className="text-[0.9375rem] font-medium">{project.title}</span>
                  <span className="text-sm text-ink-muted">{project.place}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* ── Services ───────────────────────────────────── */}
        <section id="services" className="border-t border-line bg-surface">
          <div className="mx-auto max-w-[84rem] px-5 py-20 sm:px-8 sm:py-28">
            <p className="eyebrow">What we do</p>
            <h2 className="mt-4 max-w-2xl font-display text-title sm:text-[2.5rem] sm:leading-[1.1]">
              Two kinds of brief, one standard of finish.
            </h2>

            <div className="mt-14 grid gap-12 md:grid-cols-2 md:gap-10">
              {SERVICES.map((service) => (
                <div key={service.title}>
                  <ImageSlot
                    tone={service.tone}
                    label={`${service.title} interiors`}
                    className="aspect-[16/10] w-full"
                  />
                  <h3 className="mt-6 font-display text-2xl tracking-tight">{service.title}</h3>
                  <p className="mt-3 max-w-md leading-relaxed text-ink-soft">{service.copy}</p>
                  <ul className="mt-5 space-y-2.5">
                    {service.items.map((item) => (
                      <li key={item} className="flex items-baseline gap-3 text-sm text-ink-soft">
                        <span aria-hidden className="h-px w-4 shrink-0 bg-line-strong" />
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
          <p className="eyebrow">How it works</p>
          <h2 className="mt-4 max-w-2xl font-display text-title sm:text-[2.5rem] sm:leading-[1.1]">
            From first conversation to handover.
          </h2>

          <ol className="mt-14 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {PROCESS.map((phase) => (
              <li key={phase.step} className="border-t border-line pt-5">
                <p className="font-display text-sm text-accent">{phase.step}</p>
                <h3 className="mt-2 text-lg font-medium">{phase.title}</h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-muted">{phase.copy}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Closing CTA ────────────────────────────────── */}
        <section className="border-t border-line bg-ink text-ink-inverse">
          <div className="mx-auto max-w-[84rem] px-5 py-20 sm:px-8 sm:py-28">
            <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_auto]">
              <div>
                <h2 className="max-w-2xl font-display text-[2rem] leading-[1.1] tracking-tight sm:text-[2.75rem]">
                  Tell us about your space.
                </h2>
                <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-inverse/70">
                  Six short questions. You will hear back from a designer, not a call centre.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <ButtonLink
                  href="/start-project"
                  size="lg"
                  className="bg-ink-inverse text-ink hover:bg-white"
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
        companyName={env.companyName}
        phone={env.companyPhone}
        whatsapp={env.companyWhatsApp}
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
