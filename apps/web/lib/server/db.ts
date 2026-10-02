/**
 * The single sanctioned Prisma entry point for the web app.
 *
 * This file and the per-domain repository files are the only places the
 * no-restricted-imports rule permits `@crm/database` to be imported. Anything
 * else must call a service.
 */
export { prisma } from '@crm/database'
export { Prisma } from '@crm/database'
