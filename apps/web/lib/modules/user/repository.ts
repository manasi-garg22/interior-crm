import { prisma, Role, type Prisma, type User } from '@crm/database'

export async function findByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })
}

export async function findById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } })
}

export async function recordLogin(id: string): Promise<void> {
  await prisma.user.update({ where: { id }, data: { lastLoginAt: new Date() } })
}

export async function listUsers() {
  return prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      manager: { select: { id: true, name: true } },
      _count: { select: { assignedLeads: true } },
    },
  })
}

/** Everyone who can own a lead, for the assignment dropdown. */
export async function listAssignableUsers() {
  return prisma.user.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      role: { in: [Role.SALES_EXECUTIVE, Role.SALES_MANAGER, Role.ADMIN] },
    },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, role: true },
  })
}

export async function createUser(data: Prisma.UserUncheckedCreateInput): Promise<User> {
  return prisma.user.create({ data })
}

export async function updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User> {
  return prisma.user.update({ where: { id }, data })
}

/**
 * Bumping tokenVersion invalidates every JWT already issued to this user,
 * which is how deactivation and password changes revoke live sessions.
 */
export async function revokeSessions(id: string): Promise<void> {
  await prisma.user.update({ where: { id }, data: { tokenVersion: { increment: 1 } } })
}

export async function findResetToken(tokenHash: string) {
  return prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, email: true, isActive: true } } },
  })
}

export async function createResetToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date,
): Promise<void> {
  await prisma.passwordResetToken.create({ data: { userId, tokenHash, expiresAt } })
}

export async function consumeResetToken(id: string): Promise<void> {
  await prisma.passwordResetToken.update({ where: { id }, data: { usedAt: new Date() } })
}
