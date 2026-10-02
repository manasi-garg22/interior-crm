export type ClassValue = string | false | null | undefined

/**
 * Minimal class joiner.
 *
 * Deliberately not clsx + tailwind-merge: those exist to resolve conflicting
 * utilities, and components here are written so that variants own disjoint
 * property sets. One fewer pair of dependencies in the client bundle.
 */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(' ')
}
