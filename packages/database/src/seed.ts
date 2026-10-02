import { hash } from '@node-rs/argon2'
import { PrismaClient, Role, LeadSource, type Prisma } from '@prisma/client'
import { ALL_SEED_OPTIONS } from './seed-data'

/**
 * Seeds the picklists, one user per role, and campaigns.
 * Pass --demo to also generate sample leads so the dashboard and charts are
 * not empty on day one.
 *
 *   npm run db:seed
 *   npm run db:seed -- --demo
 *
 * Idempotent: every write is an upsert keyed on a natural key, so running it
 * twice does not duplicate anything.
 */

const prisma = new PrismaClient()
const withDemoData = process.argv.includes('--demo')

/** OWASP baseline for argon2id. */
const ARGON2_OPTIONS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const

async function seedOptionValues(): Promise<void> {
  for (const option of ALL_SEED_OPTIONS) {
    await prisma.optionValue.upsert({
      where: { setKey_key: { setKey: option.setKey, key: option.key } },
      create: {
        setKey: option.setKey,
        key: option.key,
        label: option.label,
        sortOrder: option.sortOrder,
        numericMin: option.numericMin ?? null,
        numericMax: option.numericMax ?? null,
        scoreWeight: option.scoreWeight ?? null,
        metadata: (option.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
      // Only the presentation fields are refreshed. Deliberately does NOT
      // overwrite scoreWeight or the bounds, so a business tweak made in
      // Settings survives the next deploy's seed run.
      update: {
        label: option.label,
        sortOrder: option.sortOrder,
      },
    })
  }
  console.log(`  ✓ ${ALL_SEED_OPTIONS.length} option values`)
}

type SeedUser = {
  email: string
  name: string
  role: Role
}

const SEED_USERS: SeedUser[] = [
  { email: 'admin@example.com', name: 'Aarti Admin', role: Role.ADMIN },
  { email: 'manager@example.com', name: 'Manish Manager', role: Role.SALES_MANAGER },
  { email: 'sales1@example.com', name: 'Sanya Sales', role: Role.SALES_EXECUTIVE },
  { email: 'sales2@example.com', name: 'Rahul Rao', role: Role.SALES_EXECUTIVE },
  { email: 'designer@example.com', name: 'Divya Designer', role: Role.DESIGNER },
  { email: 'viewer@example.com', name: 'Vikram Viewer', role: Role.VIEWER },
]

async function seedUsers(): Promise<void> {
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD
  if (!password) {
    throw new Error(
      'SEED_SUPER_ADMIN_PASSWORD is not set. Choose a password in .env before seeding — ' +
        'this script will not invent a default one, because default credentials end up in production.',
    )
  }
  if (password.length < 12) {
    throw new Error('SEED_SUPER_ADMIN_PASSWORD must be at least 12 characters.')
  }

  const passwordHash = await hash(password, ARGON2_OPTIONS)

  const superAdminEmail = (process.env.SEED_SUPER_ADMIN_EMAIL ?? 'superadmin@example.com')
    .trim()
    .toLowerCase()

  const manager = await prisma.user.upsert({
    where: { email: 'manager@example.com' },
    create: {
      email: 'manager@example.com',
      name: 'Manish Manager',
      role: Role.SALES_MANAGER,
      passwordHash,
    },
    update: {},
  })

  await prisma.user.upsert({
    where: { email: superAdminEmail },
    create: {
      email: superAdminEmail,
      name: 'Super Admin',
      role: Role.SUPER_ADMIN,
      passwordHash,
    },
    update: { role: Role.SUPER_ADMIN },
  })

  for (const user of SEED_USERS) {
    await prisma.user.upsert({
      where: { email: user.email },
      create: {
        email: user.email,
        name: user.name,
        role: user.role,
        passwordHash,
        // Sales executives report to the manager, so the team hierarchy is
        // exercised by the seed rather than only existing in the schema.
        managerId: user.role === Role.SALES_EXECUTIVE ? manager.id : null,
      },
      update: {},
    })
  }

  console.log(`  ✓ ${SEED_USERS.length + 1} users (super admin: ${superAdminEmail})`)
}

async function seedCampaigns(): Promise<void> {
  const campaigns = [
    { code: 'modern_kitchen', name: 'Modern Kitchen Reels', source: LeadSource.INSTAGRAM, medium: 'social' },
    { code: 'luxury_living', name: 'Luxury Living Room', source: LeadSource.INSTAGRAM, medium: 'social' },
    { code: 'office_interiors', name: 'Office Interiors Search', source: LeadSource.GOOGLE, medium: 'cpc' },
  ]

  for (const campaign of campaigns) {
    await prisma.campaign.upsert({
      where: { code: campaign.code },
      create: { ...campaign, isActive: true },
      update: { name: campaign.name },
    })
  }
  console.log(`  ✓ ${campaigns.length} campaigns`)
}

async function main(): Promise<void> {
  console.log('Seeding database...')
  await seedOptionValues()
  await seedUsers()
  await seedCampaigns()

  if (withDemoData) {
    const { seedDemoLeads } = await import('./seed-demo')
    await seedDemoLeads(prisma)
  }

  console.log('Done.')
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error)
    process.exitCode = 1
  })
  .finally(() => {
    void prisma.$disconnect()
  })
