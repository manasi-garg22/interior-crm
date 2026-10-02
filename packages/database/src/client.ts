import { PrismaClient } from '@prisma/client'

/**
 * Prisma singleton, constructed lazily.
 *
 * Two problems are solved here.
 *
 * 1. Next.js hot-reloads modules in development, which would otherwise build
 *    a new PrismaClient — and a new connection pool — on every edit until
 *    Postgres refuses connections. Stashing it on globalThis survives reload.
 *
 * 2. Construction is deferred until the first property access. Importing an
 *    enum from this package must not open a database connection, and a unit
 *    test for a pure function must not require a generated client. Eager
 *    `new PrismaClient()` at module scope broke both.
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })
}

function getClient(): PrismaClient {
  const existing = globalForPrisma.prisma
  if (existing) return existing

  const created = createClient()
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = created
  }
  return created
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    return Reflect.get(getClient(), property, receiver) as unknown
  },
  has(_target, property) {
    return property in getClient()
  },
})

export type { PrismaClient }
