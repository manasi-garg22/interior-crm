import type { Prisma } from '@prisma/client'
import {
  LEAD_NUMBER_PAD,
  LEAD_NUMBER_PREFIX,
  PROJECT_NUMBER_PAD,
  PROJECT_NUMBER_PREFIX,
} from '@crm/config'

/**
 * Gap-free per-year reference numbers.
 *
 * A single atomic `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` increments
 * and reads the counter in one statement, so two simultaneous form
 * submissions can never receive the same number. `SELECT MAX(...) + 1` would
 * race, and a sequence would leave visible gaps on rollback.
 *
 * Must be called inside the same transaction as the row it numbers.
 */

type Counter = { lastValue: number }

export async function nextLeadNumber(
  tx: Prisma.TransactionClient,
  now: Date = new Date(),
): Promise<string> {
  const year = now.getUTCFullYear()

  const rows = await tx.$queryRaw<Counter[]>`
    INSERT INTO "LeadCounter" ("year", "lastValue")
    VALUES (${year}, 1)
    ON CONFLICT ("year") DO UPDATE
      SET "lastValue" = "LeadCounter"."lastValue" + 1
    RETURNING "lastValue"
  `

  const value = rows[0]?.lastValue ?? 1
  return formatReference(LEAD_NUMBER_PREFIX, year, value, LEAD_NUMBER_PAD)
}

export async function nextProjectNumber(
  tx: Prisma.TransactionClient,
  now: Date = new Date(),
): Promise<string> {
  const year = now.getUTCFullYear()

  const rows = await tx.$queryRaw<Counter[]>`
    INSERT INTO "ProjectCounter" ("year", "lastValue")
    VALUES (${year}, 1)
    ON CONFLICT ("year") DO UPDATE
      SET "lastValue" = "ProjectCounter"."lastValue" + 1
    RETURNING "lastValue"
  `

  const value = rows[0]?.lastValue ?? 1
  return formatReference(PROJECT_NUMBER_PREFIX, year, value, PROJECT_NUMBER_PAD)
}

/** e.g. formatReference('LEAD', 2026, 421, 6) → "LEAD-2026-000421" */
export function formatReference(
  prefix: string,
  year: number,
  value: number,
  pad: number,
): string {
  return `${prefix}-${year}-${String(value).padStart(pad, '0')}`
}
