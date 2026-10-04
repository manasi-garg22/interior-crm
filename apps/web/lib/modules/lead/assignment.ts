/**
 * Automatic lead assignment — the selection algorithm only.
 *
 * Deliberately free of imports so it stays a pure, exhaustively testable
 * function. Loading the candidates is a database concern and lives in the
 * repository; this module just decides between them.
 *
 * Implemented as least-loaded rather than strict positional round-robin.
 * Strict round-robin distributes evenly only if everyone closes leads at the
 * same rate; in practice it piles work onto whoever is already behind.
 * Counting open leads self-corrects, and ties break on the oldest assignment
 * so the result is deterministic.
 */

export type AssignmentCandidate = {
  id: string
  openLeadCount: number
  lastAssignedAt: Date | null
}

/** Statuses that still demand attention. WON and LOST leads are not "load". */
export const OPEN_LEAD_STATUSES = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'CONSULTATION',
  'SITE_VISIT',
  'QUOTATION',
  'DESIGN',
  'NEGOTIATION',
] as const

export function pickAssignee(candidates: AssignmentCandidate[]): string | null {
  if (candidates.length === 0) return null

  const sorted = [...candidates].sort((a, b) => {
    if (a.openLeadCount !== b.openLeadCount) return a.openLeadCount - b.openLeadCount

    const aTime = a.lastAssignedAt?.getTime() ?? 0
    const bTime = b.lastAssignedAt?.getTime() ?? 0
    if (aTime !== bTime) return aTime - bTime

    // Final tie-break on id keeps the choice stable across identical states.
    return a.id.localeCompare(b.id)
  })

  return sorted[0]?.id ?? null
}
