'use client'

import { useEffect } from 'react'

/**
 * Scroll-reveal for the marketing pages.
 *
 * Mount once per page. Any element with the `reveal` class fades up once its
 * top edge comes into view — including elements the visitor jumped straight
 * past (End key, fast flick, anchor link), so nothing is ever left invisible.
 *
 * Elements are hidden only once JavaScript has marked <html class="js">
 * (see app/layout.tsx), and the layout reveals everything after 2.5s if this
 * component never mounts.
 */
export function RevealObserver() {
  useEffect(() => {
    const win = window as Window & { __revealFallback?: number }
    if (win.__revealFallback) window.clearTimeout(win.__revealFallback)

    let pending = Array.from(document.querySelectorAll<HTMLElement>('.reveal:not(.is-visible)'))
    let frame = 0

    const check = () => {
      frame = 0
      const trigger = window.innerHeight * 0.92
      pending = pending.filter((el) => {
        if (el.getBoundingClientRect().top < trigger) {
          el.classList.add('is-visible')
          return false
        }
        return true
      })
      if (pending.length === 0) stop()
    }

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(check)
    }

    const stop = () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }

    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule, { passive: true })
    check()

    return () => {
      stop()
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return null
}
