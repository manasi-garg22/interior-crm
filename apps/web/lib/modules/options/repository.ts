import { prisma, OptionSetKey } from '@crm/database'

/** Data access for the admin-editable picklists. */

export type OptionRecord = {
  key: string
  label: string
  sortOrder: number
  numericMin: number | null
  numericMax: number | null
  scoreWeight: number | null
  metadata: Record<string, unknown> | null
}

function toRecord(row: {
  key: string
  label: string
  sortOrder: number
  numericMin: unknown
  numericMax: unknown
  scoreWeight: number | null
  metadata: unknown
}): OptionRecord {
  return {
    key: row.key,
    label: row.label,
    sortOrder: row.sortOrder,
    // Prisma returns Decimal; the app works in plain numbers, and rupee
    // amounts stay well inside the safe integer range.
    numericMin: row.numericMin == null ? null : Number(row.numericMin),
    numericMax: row.numericMax == null ? null : Number(row.numericMax),
    scoreWeight: row.scoreWeight,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
  }
}

export async function listActiveOptions(setKey: OptionSetKey): Promise<OptionRecord[]> {
  const rows = await prisma.optionValue.findMany({
    where: { setKey, isActive: true },
    orderBy: { sortOrder: 'asc' },
  })
  return rows.map(toRecord)
}

export async function listAllOptionSets(): Promise<Record<OptionSetKey, OptionRecord[]>> {
  const rows = await prisma.optionValue.findMany({
    where: { isActive: true },
    orderBy: [{ setKey: 'asc' }, { sortOrder: 'asc' }],
  })

  const grouped = Object.fromEntries(
    Object.values(OptionSetKey).map((key) => [key, [] as OptionRecord[]]),
  ) as Record<OptionSetKey, OptionRecord[]>

  for (const row of rows) {
    // Guarded rather than indexed blindly: a set key added to the enum but
    // not to the initialiser would otherwise throw at runtime.
    const bucket = grouped[row.setKey]
    if (bucket) bucket.push(toRecord(row))
  }

  return grouped
}

export async function findOption(
  setKey: OptionSetKey,
  key: string,
): Promise<OptionRecord | null> {
  const row = await prisma.optionValue.findUnique({
    where: { setKey_key: { setKey, key } },
  })
  return row && row.isActive ? toRecord(row) : null
}

/**
 * Returns the subset of `keys` that are not active members of the set.
 * Used to reject a stale client that submits an option an admin has removed.
 */
export async function findUnknownKeys(
  setKey: OptionSetKey,
  keys: string[],
): Promise<string[]> {
  if (keys.length === 0) return []

  const rows = await prisma.optionValue.findMany({
    where: { setKey, key: { in: keys }, isActive: true },
    select: { key: true },
  })

  const known = new Set(rows.map((row) => row.key))
  return keys.filter((key) => !known.has(key))
}
