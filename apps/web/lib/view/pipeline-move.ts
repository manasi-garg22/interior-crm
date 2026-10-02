/**
 * Optimistic card movement for the Kanban board.
 *
 * Extracted from the component so it can be tested directly: the column
 * totals are easy to get subtly wrong, and a drifting count is the kind of
 * bug nobody notices until a manager queries the numbers.
 */

export type BoardCard = { id: string }

export type BoardColumn<TCard extends BoardCard = BoardCard> = {
  status: string
  total: number
  cards: TCard[]
}

export function findCard<T extends BoardCard>(
  columns: BoardColumn<T>[],
  cardId: string,
): T | null {
  for (const column of columns) {
    const card = column.cards.find((item) => item.id === cardId)
    if (card) return card
  }
  return null
}

export function findColumnOf<T extends BoardCard>(
  columns: BoardColumn<T>[],
  cardId: string,
): string | null {
  return columns.find((column) => column.cards.some((card) => card.id === cardId))?.status ?? null
}

export function moveCard<T extends BoardCard>(
  columns: BoardColumn<T>[],
  cardId: string,
  toStatus: string,
): BoardColumn<T>[] {
  const card = findCard(columns, cardId)
  const fromStatus = findColumnOf(columns, cardId)

  // Unknown card, or a drop back onto the same column: nothing to do, and
  // returning a new array would cause a pointless re-render.
  if (!card || fromStatus === null || fromStatus === toStatus) return columns

  // A drop onto a column that is not on the board would otherwise delete
  // the card, since it would be removed from its source and never re-added.
  if (!columns.some((column) => column.status === toStatus)) return columns

  return columns.map((column) => {
    if (column.status === fromStatus) {
      return {
        ...column,
        total: Math.max(0, column.total - 1),
        cards: column.cards.filter((item) => item.id !== cardId),
      }
    }
    if (column.status === toStatus) {
      return { ...column, total: column.total + 1, cards: [card, ...column.cards] }
    }
    return column
  })
}
