import { describe, expect, it } from 'vitest'
import { pickAssignee, type AssignmentCandidate } from '../../apps/web/lib/modules/lead/assignment'

const candidate = (
  id: string,
  openLeadCount: number,
  lastAssignedAt: Date | null = null,
): AssignmentCandidate => ({ id, openLeadCount, lastAssignedAt })

describe('automatic lead assignment', () => {
  it('returns null when nobody is available to take the lead', () => {
    // The lead must still be created — it simply stays unassigned.
    expect(pickAssignee([])).toBeNull()
  })

  it('gives the lead to whoever has the lightest open pipeline', () => {
    const chosen = pickAssignee([candidate('busy', 12), candidate('free', 2), candidate('mid', 7)])
    expect(chosen).toBe('free')
  })

  it('breaks a load tie in favour of whoever waited longest', () => {
    const chosen = pickAssignee([
      candidate('recent', 5, new Date('2026-09-30T10:00:00Z')),
      candidate('waiting', 5, new Date('2026-09-28T10:00:00Z')),
    ])
    expect(chosen).toBe('waiting')
  })

  it('treats someone who has never been assigned as the longest waiting', () => {
    const chosen = pickAssignee([
      candidate('veteran', 3, new Date('2026-09-30T10:00:00Z')),
      candidate('newcomer', 3, null),
    ])
    expect(chosen).toBe('newcomer')
  })

  it('is deterministic when candidates are indistinguishable', () => {
    const pool = [candidate('b', 4), candidate('a', 4), candidate('c', 4)]
    expect(pickAssignee(pool)).toBe('a')
    expect(pickAssignee([...pool].reverse())).toBe('a')
  })

  it('does not mutate the caller’s array', () => {
    const pool = [candidate('b', 9), candidate('a', 1)]
    pickAssignee(pool)
    expect(pool.map((c) => c.id)).toEqual(['b', 'a'])
  })
})
