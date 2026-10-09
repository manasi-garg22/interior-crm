'use client'

import { useEffect } from 'react'

/**
 * Scroll-reveal for the marketing pages.
 *
 * Mount once per page. Any element with the `reveal` class fades up the first
 * time it enters the viewport. Elements are hidden only once JavaScript has
 * marked <html class="js"> (see app/layout.tsx), so content is never lost
 * if scripts fail — and the layout script reveals everything after 2.5s if
 * this observer never starts.
 */
export function RevealObserver() {
  useEffect(() => {
    const win = window as Window & { __revealFallback?: number }
    if (win.__revealFallback) window.clearTimeout(win.__revealFallback)

    const elements = document.querySelectorAll<HTMLElement>('.reveal:not(.is-visible)')
    if (!('IntersectionObserver' in window)) {
      elements.forEach((el) => el.classList.add('is-visible'))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    )

    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return null
}
