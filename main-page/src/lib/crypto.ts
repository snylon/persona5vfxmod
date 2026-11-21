import crypto from 'node:crypto'

/**
 * Hash a password using Node's built-in PBKDF2 (matching LevelUp's crypto implementation).
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

/**
 * Verify a password against a stored salt:hash representation.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false
  const [salt, originalHash] = storedHash.split(':')
  if (!salt || !originalHash) return false
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
  const a = Buffer.from(hash, 'hex')
  const b = Buffer.from(originalHash, 'hex')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}
