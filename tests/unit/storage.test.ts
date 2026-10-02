import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { LocalFileStorage, buildStorageKey } from '@crm/storage'

describe('storage keys', () => {
  it('produces an unguessable key so documents cannot be enumerated', () => {
    const a = buildStorageKey('lead', 'lead_123', 'pdf')
    const b = buildStorageKey('lead', 'lead_123', 'pdf')

    expect(a).not.toBe(b)
    expect(a).toMatch(/^lead\/\d{4}\/\d{2}\/lead_123\/[0-9a-f-]{36}\.pdf$/)
  })
})

describe('LocalFileStorage', () => {
  let root: string
  let storage: LocalFileStorage

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'crm-storage-'))
    storage = new LocalFileStorage(root)
  })

  afterAll(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('round-trips a file and reports size and checksum', async () => {
    const body = Buffer.from('floor plan bytes')
    const stored = await storage.put('lead/2026/01/l1/file.pdf', body, 'application/pdf')

    expect(stored.sizeBytes).toBe(body.byteLength)
    expect(stored.checksum).toHaveLength(64)
    expect(await storage.get(stored.key)).toEqual(body)
  })

  it('refuses a traversal key that would escape the storage root', async () => {
    await expect(
      storage.put('../../escaped.txt', Buffer.from('x'), 'text/plain'),
    ).rejects.toThrow(/outside the storage root/)
  })

  it('treats deleting a missing key as a no-op', async () => {
    await expect(storage.delete('lead/does/not/exist.pdf')).resolves.toBeUndefined()
  })
})
