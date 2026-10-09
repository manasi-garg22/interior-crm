'use client'

import { useEffect, useRef } from 'react'

/**
 * Counts from 0 to `to` the first time it scrolls into view.
 *
 * Server-renders the final number, so search engines and no-JS visitors
 * always see the real figure. The animation writes to the DOM node directly
 * rather than through state: no re-render per frame.
 */
export function CountUp({
  to,
  suffix = '',
  durationMs = 1400,
}: {
  to: number
  suffix?: string
  durationMs?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!('IntersectionObserver' in window)) return

    const render = (value: number) => {
      el.textContent = `${value}${suffix}`
    }

    // Already on screen at load: leave the real number alone, no flash.
    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight && rect.bottom > 0) return

    render(0)
    let frame = 0
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        observer.disconnect()
        const start = performance.now()
        const tick = (now: number) => {
          const progress = Math.min((now - start) / durationMs, 1)
          render(Math.round(to * (1 - Math.pow(1 - progress, 3))))
          if (progress < 1) frame = requestAnimationFrame(tick)
        }
        frame = requestAnimationFrame(tick)
      },
      { threshold: 0.5 },
    )
    observer.observe(el)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
      render(to)
    }
  }, [to, suffix, durationMs])

  return (
    <span ref={ref} className="tabular-nums">
      {to}
      {suffix}
    </span>
  )
}
