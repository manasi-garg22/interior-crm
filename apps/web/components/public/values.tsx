/**
 * "We value your time, your money, your dream." — the studio's promise.
 * Shared by the homepage and the Start Project page so the wording never drifts.
 */

export const VALUES = [
  {
    title: 'Your time',
    copy: 'A written schedule before work starts, one point of contact, and weekly progress you can see.',
    icon: (
      <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-6">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Your money',
    copy: 'A clear, line-by-line quotation before design begins. No surprise costs halfway through.',
    icon: (
      <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-6">
        <path d="M7 5h10M7 9.5h10M9.5 5c3.5 0 5 2 5 4.5S13 14 9.5 14H8l6.5 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Your dream',
    copy: 'Designed around how you live or trade — you approve every room in 3D before we build it.',
    icon: (
      <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-6">
        <path d="M4 20V9.5L12 4l8 5.5V20" strokeLinejoin="round" />
        <path d="M9.5 20v-5.5h5V20" strokeLinejoin="round" />
      </svg>
    ),
  },
] as const

/** Full section for the homepage. */
export function ValuesSection() {
  return (
    <section aria-labelledby="values-heading" className="mx-auto max-w-[84rem] px-5 py-20 sm:px-8 sm:py-28">
      <div className="reveal max-w-2xl">
        <p className="eyebrow">Our promise</p>
        <h2 id="values-heading" className="mt-4 font-display text-title sm:text-[2.5rem] sm:leading-[1.1]">
          We value your time, your money,{' '}
          <span className="text-accent">your dream.</span>
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-ink-soft">Let&apos;s work together.</p>
      </div>

      <div className="mt-14 grid gap-5 md:grid-cols-3">
        {VALUES.map((value, index) => (
          <div
            key={value.title}
            className="reveal group rounded-[2px] border border-line bg-surface p-7 transition-all duration-500 hover:-translate-y-1 hover:border-accent/50 hover:shadow-[0_18px_40px_-24px_rgba(27,26,23,0.35)]"
            style={{ '--delay': `${index * 130}ms` } as React.CSSProperties}
          >
            <span className="inline-flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent transition-transform duration-500 group-hover:scale-110">
              {value.icon}
            </span>
            <h3 className="mt-6 font-display text-2xl tracking-tight">{value.title}</h3>
            <p className="mt-3 leading-relaxed text-ink-soft">{value.copy}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/** Compact strip for the Start Project page — reassurance, not a distraction. */
export function ValuesStrip() {
  return (
    // One row even on phones, so the form starts close to the top of the screen.
    <ul className="grid grid-cols-3 gap-2 sm:gap-3">
      {VALUES.map((value, index) => (
        <li
          key={value.title}
          className="hero-in flex flex-col items-center gap-2 rounded-[2px] border border-line bg-surface px-2 py-3 text-center sm:flex-row sm:gap-3 sm:px-4 sm:text-left"
          style={{ '--delay': `${300 + index * 120}ms` } as React.CSSProperties}
        >
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
            {value.icon}
          </span>
          <span className="text-xs sm:text-sm">
            <span className="hidden sm:inline">We value </span>
            <span className="font-medium">{value.title}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
