import NextAuth, { type DefaultSession } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { getEnv } from '@crm/config'
import { loginSchema } from '@crm/validation'
import { revalidateSession, verifyCredentials } from '@/lib/modules/user/service'

/**
 * Auth.js v5, credentials provider, JWT session strategy.
 *
 * JWT rather than database sessions because the Credentials provider is
 * incompatible with adapter-backed sessions — that is a hard constraint in
 * Auth.js, not a preference.
 *
 * The usual objection to JWT is that sessions cannot be revoked. That gap is
 * closed by `tokenVersion`: the jwt callback re-reads the user from the
 * database on a rolling interval and drops the token if the account was
 * disabled or its version bumped. Revocation therefore takes effect within
 * `REVALIDATE_AFTER_MS`, not at the token's 8-hour expiry.
 */

const REVALIDATE_AFTER_MS = 60_000

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
    } & DefaultSession['user']
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const env = getEnv()
  return {
  secret: env.AUTH_SECRET,
  trustHost: env.AUTH_TRUST_HOST,

  session: {
    strategy: 'jwt',
    maxAge: env.SESSION_MAX_AGE_SECONDS,
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw)
        if (!parsed.success) return null

        const user = await verifyCredentials(parsed.data.email, parsed.data.password)
        if (!user) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tokenVersion: user.tokenVersion,
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // Fresh sign-in.
      if (user) {
        token.sub = user.id
        token.role = (user as { role?: string }).role
        token.tokenVersion = (user as { tokenVersion?: number }).tokenVersion
        token.checkedAt = Date.now()
        return token
      }

      const checkedAt = typeof token.checkedAt === 'number' ? token.checkedAt : 0
      if (Date.now() - checkedAt < REVALIDATE_AFTER_MS) return token

      const current = await revalidateSession(
        String(token.sub),
        typeof token.tokenVersion === 'number' ? token.tokenVersion : -1,
      )

      // Returning null invalidates the session, signing the user out.
      if (!current) return null

      token.role = current.role
      token.name = current.name
      token.email = current.email
      token.checkedAt = Date.now()
      return token
    },

    session({ session, token }) {
      session.user.id = String(token.sub)
      session.user.role = typeof token.role === 'string' ? token.role : 'VIEWER'
      return session
    },
  },

  cookies: {
    sessionToken: {
      name: env.NODE_ENV === 'production' ? '__Secure-authjs.session-token' : 'authjs.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: env.NODE_ENV === 'production',
      },
    },
  },
  }
})
