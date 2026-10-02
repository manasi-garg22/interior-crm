import { hash, verify } from '@node-rs/argon2'

/**
 * Password hashing.
 *
 * argon2id at the OWASP baseline. @node-rs/argon2 is used over the `argon2`
 * package because it ships prebuilt Windows binaries — no Visual Studio
 * build tools required to install the project.
 */

const OPTIONS = {
  memoryCost: 19_456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
} as const

export function hashPassword(plaintext: string): Promise<string> {
  return hash(plaintext, OPTIONS)
}

/**
 * Never throws on a malformed stored hash — a corrupt row must read as
 * "wrong password", not as a 500 that tells an attacker the account exists.
 */
export async function verifyPassword(storedHash: string, plaintext: string): Promise<boolean> {
  try {
    return await verify(storedHash, plaintext, OPTIONS)
  } catch {
    return false
  }
}
