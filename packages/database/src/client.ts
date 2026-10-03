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

// Module-level cache: one client per server instance in every environment.
// Previously production skipped caching entirely, so each property access
// built a new client — a $transaction opened on one client and its queries
// ran on another ("Transaction not found").
let client: PrismaClient | undefined

function getClient(): PrismaClient {
  if (client) return client

  // Reuse across dev hot reloads.
  client = globalForPrisma.prisma ?? createClient()
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client
  }
  return client
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const real = getClient()
    const value = Reflect.get(real, property, real) as unknown
    // Bind methods to the real client so `this` never points at the proxy.
    return typeof value === 'function' ? value.bind(real) : value
  },
  has(_target, property) {
    return property in getClient()
  },
})

export type { PrismaClient }
