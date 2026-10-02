import { createHash, randomUUID } from 'node:crypto'
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { getEnv } from '@crm/config'
import { S3FileStorage } from './s3'

/**
 * File storage contract.
 *
 * Binary content never goes into PostgreSQL — the database stores only the
 * metadata row and the storage key returned here.
 */

export type StoredObject = {
  key: string
  sizeBytes: number
  checksum: string
}

export type PresignedUpload = {
  /** Where the browser PUTs the bytes. */
  url: string
  /** Headers the browser must echo back, if the driver requires any. */
  headers: Record<string, string>
  key: string
  expiresInSeconds: number
}

export interface FileStorage {
  readonly driver: string
  put(key: string, body: Buffer, contentType: string): Promise<StoredObject>
  get(key: string): Promise<Buffer>
  delete(key: string): Promise<void>
  presignUpload(key: string, contentType: string): Promise<PresignedUpload>
  presignDownload(key: string, expiresInSeconds?: number): Promise<string>
}

/**
 * Builds a collision-proof, non-guessable storage key. Enumerating other
 * customers' floor plans by incrementing an id must be impossible.
 */
export function buildStorageKey(scope: string, scopeId: string, extension: string): string {
  const yyyymm = new Date().toISOString().slice(0, 7).replace('-', '/')
  return `${scope}/${yyyymm}/${scopeId}/${randomUUID()}.${extension}`
}

function checksumOf(body: Buffer): string {
  return createHash('sha256').update(body).digest('hex')
}

/**
 * Local disk driver for development. Writes under ./.storage (gitignored),
 * so uploads work with no S3 account. Never use this in production — it does
 * not survive a redeploy on an ephemeral filesystem.
 */
export class LocalFileStorage implements FileStorage {
  readonly driver = 'local'

  constructor(private readonly root: string = resolve(process.cwd(), '.storage')) {}

  private pathFor(key: string): string {
    const full = resolve(this.root, key)
    // Defence against a key like "../../etc/passwd".
    if (!full.startsWith(resolve(this.root))) {
      throw new Error('Refusing to resolve a storage key outside the storage root')
    }
    return full
  }

  async put(key: string, body: Buffer, _contentType: string): Promise<StoredObject> {
    const path = this.pathFor(key)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, body)
    return { key, sizeBytes: body.byteLength, checksum: checksumOf(body) }
  }

  async get(key: string): Promise<Buffer> {
    return readFile(this.pathFor(key))
  }

  async delete(key: string): Promise<void> {
    await unlink(this.pathFor(key)).catch(() => undefined)
  }

  async presignUpload(key: string, _contentType: string): Promise<PresignedUpload> {
    // No real signing locally; the app route accepts the bytes directly.
    return {
      url: `/api/uploads/local/${encodeURIComponent(key)}`,
      headers: {},
      key,
      expiresInSeconds: 300,
    }
  }

  async presignDownload(key: string): Promise<string> {
    return `/api/uploads/local/${encodeURIComponent(key)}`
  }
}

let storage: FileStorage | undefined

export function getFileStorage(): FileStorage {
  if (storage) return storage

  const env = getEnv()

  if (env.STORAGE_DRIVER === 's3') {
    if (!env.S3_ACCESS_KEY || !env.S3_SECRET_KEY || !env.S3_BUCKET) {
      throw new Error(
        'STORAGE_DRIVER=s3 requires S3_ACCESS_KEY, S3_SECRET_KEY and S3_BUCKET. ' +
          'Set them, or switch to STORAGE_DRIVER=local for development.',
      )
    }

    storage = new S3FileStorage({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      accessKey: env.S3_ACCESS_KEY,
      secretKey: env.S3_SECRET_KEY,
      bucket: env.S3_BUCKET,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
    })
    return storage
  }

  storage = new LocalFileStorage(join(process.cwd(), '.storage'))
  return storage
}

export function setFileStorage(next: FileStorage | undefined): void {
  storage = next
}
