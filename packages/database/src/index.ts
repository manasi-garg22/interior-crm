/**
 * The only module permitted to export a Prisma client.
 *
 * Application code reaches it exclusively through
 * `apps/web/lib/modules/<domain>/repository.ts` — enforced by the
 * no-restricted-imports rule in apps/web/eslint.config.mjs.
 */

export { prisma, type PrismaClient } from './client'

export {
  Prisma,
  Role,
  LeadStatus,
  LeadTemperature,
  LeadSource,
  PropertyType,
  PropertyStatus,
  ContactMethod,
  ActivityType,
  FollowUpType,
  FollowUpStatus,
  CommChannel,
  CommDirection,
  CommStatus,
  DocumentCategory,
  ProjectStatus,
  OptionSetKey,
  OutboxStatus,
} from '@prisma/client'

export type {
  User,
  Customer,
  Lead,
  LeadRequirement,
  LeadActivity,
  FollowUp,
  Communication,
  Document,
  Project,
  Campaign,
  OptionValue,
  Notification,
  AuditLog,
  OutboxEvent,
  PasswordResetToken,
} from '@prisma/client'
