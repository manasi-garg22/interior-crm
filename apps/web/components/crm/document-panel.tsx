'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { SelectInput } from '@/components/ui/field'
import { titleCase } from '@/components/ui/badge'

export type DocumentRow = {
  id: string
  fileName: string
  sizeBytes: number
  category: string
  createdAt: string
}

const CATEGORIES = [
  'FLOOR_PLAN',
  'PROPERTY_PHOTO',
  'INSPIRATION',
  'EXISTING_DESIGN',
  'QUOTATION',
  'CONTRACT',
  'OTHER',
]

export function DocumentPanel({
  leadId,
  documents,
  canUpload,
}: {
  leadId: string
  documents: DocumentRow[]
  canUpload: boolean
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [category, setCategory] = useState('FLOOR_PLAN')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function upload(files: FileList | null): Promise<void> {
    if (!files?.length) return

    setBusy(true)
    setError(null)

    for (const file of Array.from(files)) {
      const body = new FormData()
      body.append('file', file)
      body.append('leadId', leadId)
      body.append('category', category)

      try {
        const response = await fetch('/api/documents/upload', { method: 'POST', body })
        if (!response.ok) {
          const payload = (await response.json()) as { error?: string }
          setError(payload.error ?? `Could not upload ${file.name}.`)
        }
      } catch {
        setError(`Could not upload ${file.name}.`)
      }
    }

    setBusy(false)
    if (inputRef.current) inputRef.current.value = ''
    // Re-renders the server component so the new rows appear.
    router.refresh()
  }

  return (
    <section className="border border-line bg-surface p-5">
      <p className="eyebrow">Documents</p>

      {documents.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">Nothing attached yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {documents.map((document) => (
            <li key={document.id} className="flex items-center gap-3 py-2.5 first:pt-0">
              <div className="min-w-0 flex-1">
                <a
                  href={`/api/documents/${document.id}/download`}
                  className="block truncate text-sm underline-offset-4 hover:underline"
                >
                  {document.fileName}
                </a>
                <p className="text-xs text-ink-muted">
                  {titleCase(document.category)} · {(document.sizeBytes / 1024 / 1024).toFixed(1)} MB
                  · {document.createdAt}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {canUpload ? (
        <div className="mt-5 space-y-3 border-t border-line pt-4">
          <SelectInput
            aria-label="Document type"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-10 text-sm"
          >
            {CATEGORIES.map((option) => (
              <option key={option} value={option}>
                {titleCase(option)}
              </option>
            ))}
          </SelectInput>

          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
            className="sr-only"
            onChange={(event) => void upload(event.target.files)}
            disabled={busy}
          />

          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? 'Uploading…' : 'Upload a file'}
          </Button>

          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
