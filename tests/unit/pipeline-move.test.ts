import { describe, expect, it } from 'vitest'
import {
  findCard,
  findColumnOf,
  moveCard,
  type BoardColumn,
} from '../../apps/web/lib/view/pipeline-move'

const board = (): BoardColumn[] => [
  { status: 'NEW', total: 3, cards: [{ id: 'a' }, { id: 'b' }] },
  { status: 'CONTACTED', total: 1, cards: [{ id: 'c' }] },
  { status: 'WON', total: 0, cards: [] },
]

describe('optimistic pipeline movement', () => {
  it('moves a card between columns and adjusts both totals', () => {
    const result = moveCard(board(), 'a', 'CONTACTED')

    expect(result[0]?.cards.map((c) => c.id)).toEqual(['b'])
    expect(result[0]?.total).toBe(2)
    expect(result[1]?.cards.map((c) => c.id)).toEqual(['a', 'c'])
    expect(result[1]?.total).toBe(2)
  })

  it('keeps the board total constant across a move', () => {
    const before = board().reduce((sum, column) => sum + column.total, 0)
    const after = moveCard(board(), 'c', 'WON').reduce((sum, column) => sum + column.total, 0)
    expect(after).toBe(before)
  })

  it('puts the moved card at the top of its new column', () => {
    const result = moveCard(board(), 'a', 'CONTACTED')
    expect(result[1]?.cards[0]?.id).toBe('a')
  })

  it('is a no-op when dropped back on the same column', () => {
    const input = board()
    expect(moveCard(input, 'a', 'NEW')).toBe(input)
  })

  it('is a no-op for a card that is not on the board', () => {
    const input = board()
    expect(moveCard(input, 'ghost', 'WON')).toBe(input)
  })

  it('refuses a column that does not exist rather than losing the card', () => {
    const input = board()
    // Without this guard the card would be removed from NEW and never
    // re-added anywhere — it would simply vanish from the board.
    expect(moveCard(input, 'a', 'NOT_A_COLUMN')).toBe(input)
  })

  it('never drives a total negative even if counts are inconsistent', () => {
    const inconsistent: BoardColumn[] = [
      { status: 'NEW', total: 0, cards: [{ id: 'a' }] },
      { status: 'WON', total: 0, cards: [] },
    ]
    expect(moveCard(inconsistent, 'a', 'WON')[0]?.total).toBe(0)
  })

  it('does not mutate the input board', () => {
    const input = board()
    moveCard(input, 'a', 'CONTACTED')
    expect(input[0]?.cards.map((c) => c.id)).toEqual(['a', 'b'])
    expect(input[0]?.total).toBe(3)
  })
})

describe('board lookups', () => {
  it('finds a card and its column', () => {
    expect(findCard(board(), 'c')).toEqual({ id: 'c' })
    expect(findColumnOf(board(), 'c')).toBe('CONTACTED')
  })

  it('returns null for an unknown card', () => {
    expect(findCard(board(), 'nope')).toBeNull()
    expect(findColumnOf(board(), 'nope')).toBeNull()
  })
})
