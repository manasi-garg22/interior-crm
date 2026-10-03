'use client'

import { useState } from 'react'
import { ChipGroup, ChipToggle, ChoiceCard, ChoiceGrid } from '@/components/ui/choice'
import { Field, SelectInput, TextArea, TextInput } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { sanitizePhoneInput } from '@/lib/public-form-contract'

export type PublicOption = {
  key: string
  label: string
  category?: string | undefined
}

export type FormState = {
  propertyType?: string
  propertyTypeOther?: string
  propertyStatus?: string
  locationLine?: string
  city?: string
  state?: string
  pincode?: string
  areaSqft?: string
  floors?: string
  possessionDate?: string
  spaceRequirements: string[]
  spaceOther?: string
  designStyles: string[]
  budgetKey?: string
  timelineKey?: string
  fullName?: string
  phone?: string
  whatsappNumber?: string
  email?: string
  preferredContact?: string
  notes?: string
}

export type UploadedFile = {
  storageKey: string
  fileName: string
  mimeType: string
  sizeBytes: number
}

type StepProps = {
  values: FormState
  errors: Record<string, string>
  onChange: (update: Partial<FormState>) => void
}

const PROPERTY_TYPES = [
  { value: 'RESIDENTIAL', title: 'Home', description: 'Apartment, villa or independent house' },
  { value: 'OFFICE', title: 'Office', description: 'Workspace or corporate fit-out' },
  { value: 'RESTAURANT', title: 'Restaurant', description: 'Dining space, kitchen and front of house' },
  { value: 'CAFE', title: 'Café', description: 'Coffee shop or quick-service space' },
  { value: 'RETAIL', title: 'Retail', description: 'Store, showroom or counter' },
  { value: 'HOTEL', title: 'Hotel', description: 'Rooms, lobby and hospitality areas' },
  { value: 'COMMERCIAL', title: 'Other commercial', description: 'Clinic, salon, studio and similar' },
  { value: 'OTHER', title: 'Something else', description: 'Tell us in a line' },
]

const PROPERTY_STATUSES = [
  { value: 'NEW_PROPERTY', title: 'New property', description: 'Recently purchased, not yet fitted out' },
  { value: 'UNDER_CONSTRUCTION', title: 'Under construction', description: 'Still being built' },
  { value: 'READY_TO_MOVE', title: 'Ready to move', description: 'Handed over, awaiting interiors' },
  { value: 'EXISTING_SPACE', title: 'Existing space', description: 'Currently in use' },
  { value: 'RENOVATION', title: 'Renovation', description: 'Replacing or reworking what is there' },
]

const CONTACT_METHODS = [
  { value: 'PHONE', title: 'Phone call' },
  { value: 'WHATSAPP', title: 'WhatsApp' },
  { value: 'EMAIL', title: 'Email' },
]

// ── Step 1 ──────────────────────────────────────────────────

export function StepProjectType({ values, errors, onChange }: StepProps) {
  return (
    <div className="space-y-6">
      <ChoiceGrid columns={2}>
        {PROPERTY_TYPES.map((option) => (
          <ChoiceCard
            key={option.value}
            name="propertyType"
            value={option.value}
            checked={values.propertyType === option.value}
            onSelect={(value) => onChange({ propertyType: value })}
            title={option.title}
            description={option.description}
          />
        ))}
      </ChoiceGrid>

      {errors.propertyType ? (
        <p role="alert" className="text-sm text-danger">
          {errors.propertyType}
        </p>
      ) : null}

      {values.propertyType === 'OTHER' ? (
        <Field label="What kind of space is it?" error={errors.propertyTypeOther} required>
          {(field) => (
            <TextInput
              {...field}
              value={values.propertyTypeOther ?? ''}
              onChange={(event) => onChange({ propertyTypeOther: event.target.value })}
              placeholder="e.g. a dental clinic"
              invalid={Boolean(errors.propertyTypeOther)}
            />
          )}
        </Field>
      ) : null}
    </div>
  )
}

// ── Step 2 ──────────────────────────────────────────────────

export function StepProperty({ values, errors, onChange }: StepProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-medium">What stage is the property at?</p>
        <ChoiceGrid columns={2}>
          {PROPERTY_STATUSES.map((option) => (
            <ChoiceCard
              key={option.value}
              name="propertyStatus"
              value={option.value}
              checked={values.propertyStatus === option.value}
              onSelect={(value) => onChange({ propertyStatus: value })}
              title={option.title}
              description={option.description}
            />
          ))}
        </ChoiceGrid>
        {errors.propertyStatus ? (
          <p role="alert" className="text-sm text-danger">
            {errors.propertyStatus}
          </p>
        ) : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="City" error={errors.city} required>
          {(field) => (
            <TextInput
              {...field}
              value={values.city ?? ''}
              onChange={(event) => onChange({ city: event.target.value })}
              placeholder="Vadodara"
              autoComplete="address-level2"
              invalid={Boolean(errors.city)}
            />
          )}
        </Field>

        <Field label="Area or locality" hint="Optional" error={errors.locationLine}>
          {(field) => (
            <TextInput
              {...field}
              value={values.locationLine ?? ''}
              onChange={(event) => onChange({ locationLine: event.target.value })}
              placeholder="Indiranagar"
            />
          )}
        </Field>

        <Field label="Approximate area" hint="In square feet" error={errors.areaSqft}>
          {(field) => (
            <TextInput
              {...field}
              type="number"
              inputMode="numeric"
              min={1}
              value={values.areaSqft ?? ''}
              onChange={(event) => onChange({ areaSqft: event.target.value })}
              placeholder="1450"
              invalid={Boolean(errors.areaSqft)}
            />
          )}
        </Field>

        <Field label="Number of floors" hint="Optional" error={errors.floors}>
          {(field) => (
            <TextInput
              {...field}
              type="number"
              inputMode="numeric"
              min={1}
              value={values.floors ?? ''}
              onChange={(event) => onChange({ floors: event.target.value })}
              placeholder="1"
              invalid={Boolean(errors.floors)}
            />
          )}
        </Field>

        <Field
          label="Possession or completion date"
          hint="Optional — helps us plan the schedule"
          error={errors.possessionDate}
        >
          {(field) => (
            <TextInput
              {...field}
              type="date"
              value={values.possessionDate ?? ''}
              onChange={(event) => onChange({ possessionDate: event.target.value })}
              invalid={Boolean(errors.possessionDate)}
            />
          )}
        </Field>

        <Field label="PIN code" hint="Optional" error={errors.pincode}>
          {(field) => (
            <TextInput
              {...field}
              inputMode="numeric"
              maxLength={6}
              value={values.pincode ?? ''}
              onChange={(event) => onChange({ pincode: event.target.value })}
              placeholder="560038"
              invalid={Boolean(errors.pincode)}
            />
          )}
        </Field>
      </div>
    </div>
  )
}

// ── Step 3 ──────────────────────────────────────────────────

export function StepRequirements({
  values,
  errors,
  onChange,
  spaces,
  styles,
}: StepProps & { spaces: PublicOption[]; styles: PublicOption[] }) {
  function toggle(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
  }

  return (
    <div className="space-y-9">
      <div className="space-y-3">
        <p className="text-sm font-medium">Which areas need work?</p>
        <ChipGroup>
          {spaces.map((option) => (
            <ChipToggle
              key={option.key}
              value={option.key}
              label={option.label}
              checked={values.spaceRequirements.includes(option.key)}
              onToggle={(value) =>
                onChange({ spaceRequirements: toggle(values.spaceRequirements, value) })
              }
            />
          ))}
        </ChipGroup>
        {errors.spaceRequirements ? (
          <p role="alert" className="text-sm text-danger">
            {errors.spaceRequirements}
          </p>
        ) : null}
      </div>

      <Field label="Anything else we should include?" hint="Optional" error={errors.spaceOther}>
        {(field) => (
          <TextInput
            {...field}
            value={values.spaceOther ?? ''}
            onChange={(event) => onChange({ spaceOther: event.target.value })}
            placeholder="e.g. a home office nook"
          />
        )}
      </Field>

      <div className="space-y-3">
        <p className="text-sm font-medium">
          Any styles you lean towards?{' '}
          <span className="font-normal text-ink-muted">Optional</span>
        </p>
        <ChipGroup>
          {styles.map((option) => (
            <ChipToggle
              key={option.key}
              value={option.key}
              label={option.label}
              checked={values.designStyles.includes(option.key)}
              onToggle={(value) => onChange({ designStyles: toggle(values.designStyles, value) })}
            />
          ))}
        </ChipGroup>
      </div>
    </div>
  )
}

// ── Step 4 ──────────────────────────────────────────────────

export function StepBudget({
  values,
  errors,
  onChange,
  budgets,
  timelines,
}: StepProps & { budgets: PublicOption[]; timelines: PublicOption[] }) {
  return (
    <div className="space-y-9">
      <div className="space-y-3">
        <p className="text-sm font-medium">What budget do you have in mind?</p>
        <ChoiceGrid columns={2}>
          {budgets.map((option) => (
            <ChoiceCard
              key={option.key}
              name="budgetKey"
              value={option.key}
              checked={values.budgetKey === option.key}
              onSelect={(value) => onChange({ budgetKey: value })}
              title={option.label}
            />
          ))}
        </ChoiceGrid>
        {errors.budgetKey ? (
          <p role="alert" className="text-sm text-danger">
            {errors.budgetKey}
          </p>
        ) : null}
        <p className="text-sm text-ink-muted">
          A range is enough. It only helps us scope the right solution.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">When would you like to start?</p>
        <ChoiceGrid columns={2}>
          {timelines.map((option) => (
            <ChoiceCard
              key={option.key}
              name="timelineKey"
              value={option.key}
              checked={values.timelineKey === option.key}
              onSelect={(value) => onChange({ timelineKey: value })}
              title={option.label}
            />
          ))}
        </ChoiceGrid>
        {errors.timelineKey ? (
          <p role="alert" className="text-sm text-danger">
            {errors.timelineKey}
          </p>
        ) : null}
      </div>
    </div>
  )
}

// ── Step 5 ──────────────────────────────────────────────────

export function StepContact({ values, errors, onChange }: StepProps) {
  const [sameAsPhone, setSameAsPhone] = useState(true)

  return (
    <div className="space-y-6">
      <Field label="Your name" error={errors.fullName} required>
        {(field) => (
          <TextInput
            {...field}
            value={values.fullName ?? ''}
            onChange={(event) => onChange({ fullName: event.target.value })}
            placeholder="Priya Sharma"
            autoComplete="name"
            invalid={Boolean(errors.fullName)}
          />
        )}
      </Field>

      <Field label="Phone number" hint="10-digit mobile number" error={errors.phone} required>
        {(field) => (
          <TextInput
            {...field}
            type="tel"
            inputMode="tel"
            maxLength={20}
            value={values.phone ?? ''}
            onChange={(event) => {
              const phone = sanitizePhoneInput(event.target.value)
              onChange(sameAsPhone ? { phone, whatsappNumber: phone } : { phone })
            }}
            placeholder="98765 43210"
            autoComplete="tel"
            invalid={Boolean(errors.phone)}
          />
        )}
      </Field>

      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink-soft">
        <input
          type="checkbox"
          checked={sameAsPhone}
          onChange={(event) => {
            setSameAsPhone(event.target.checked)
            onChange({ whatsappNumber: event.target.checked ? values.phone : '' })
          }}
          className="size-4 accent-[var(--color-ink)]"
        />
        This number is on WhatsApp
      </label>

      {!sameAsPhone ? (
        <Field label="WhatsApp number" hint="Optional" error={errors.whatsappNumber}>
          {(field) => (
            <TextInput
              {...field}
              type="tel"
              inputMode="tel"
              maxLength={20}
              value={values.whatsappNumber ?? ''}
              onChange={(event) =>
                onChange({ whatsappNumber: sanitizePhoneInput(event.target.value) })
              }
              placeholder="98765 43210"
              invalid={Boolean(errors.whatsappNumber)}
            />
          )}
        </Field>
      ) : null}

      <Field label="Email" hint="Optional — for drawings and quotations" error={errors.email}>
        {(field) => (
          <TextInput
            {...field}
            type="email"
            value={values.email ?? ''}
            onChange={(event) => onChange({ email: event.target.value })}
            placeholder="priya@example.com"
            autoComplete="email"
            invalid={Boolean(errors.email)}
          />
        )}
      </Field>

      <Field label="How would you prefer we reach you?" error={errors.preferredContact}>
        {(field) => (
          <SelectInput
            {...field}
            value={values.preferredContact ?? 'PHONE'}
            onChange={(event) => onChange({ preferredContact: event.target.value })}
          >
            {CONTACT_METHODS.map((method) => (
              <option key={method.value} value={method.value}>
                {method.title}
              </option>
            ))}
          </SelectInput>
        )}
      </Field>

      <Field
        label="Tell us about your requirements"
        hint="Optional — anything you would like us to know"
        error={errors.notes}
      >
        {(field) => (
          <TextArea
            {...field}
            value={values.notes ?? ''}
            onChange={(event) => onChange({ notes: event.target.value })}
            placeholder="We are moving in next month and want the kitchen and wardrobes done first…"
            invalid={Boolean(errors.notes)}
          />
        )}
      </Field>
    </div>
  )
}

// ── Step 6 ──────────────────────────────────────────────────

const MAX_FILES = 10

export function StepUploads({
  uploads,
  onChange,
}: {
  uploads: UploadedFile[]
  onChange: (files: UploadedFile[]) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFiles(fileList: FileList | null): Promise<void> {
    if (!fileList?.length) return

    const remaining = MAX_FILES - uploads.length
    if (remaining <= 0) {
      setError(`You can attach up to ${MAX_FILES} files.`)
      return
    }

    setBusy(true)
    setError(null)

    const accepted: UploadedFile[] = []

    for (const file of Array.from(fileList).slice(0, remaining)) {
      const body = new FormData()
      body.append('file', file)

      try {
        const response = await fetch('/api/public/uploads', { method: 'POST', body })
        const payload = (await response.json()) as UploadedFile & { error?: string }

        if (!response.ok) {
          setError(payload.error ?? `Could not upload ${file.name}.`)
          continue
        }
        accepted.push(payload)
      } catch {
        setError(`Could not upload ${file.name}. Check your connection.`)
      }
    }

    onChange([...uploads, ...accepted])
    setBusy(false)
  }

  return (
    <div className="space-y-6">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-line-strong bg-surface px-6 py-12 text-center transition-colors hover:border-ink-muted">
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
          className="sr-only"
          onChange={(event) => void handleFiles(event.target.files)}
          disabled={busy}
        />
        <span className="text-[0.9375rem] font-medium">
          {busy ? 'Uploading…' : 'Add floor plans, photos or inspiration'}
        </span>
        <span className="text-sm text-ink-muted">JPG, PNG, WEBP, HEIC or PDF — up to 15 MB each</span>
      </label>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      {uploads.length > 0 ? (
        <ul className="divide-y divide-line border border-line bg-surface">
          {uploads.map((file) => (
            <li key={file.storageKey} className="flex items-center gap-4 px-4 py-3">
              <span className="min-w-0 flex-1 truncate text-sm">{file.fileName}</span>
              <span className="shrink-0 text-xs text-ink-muted">
                {(file.sizeBytes / 1024 / 1024).toFixed(1)} MB
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange(uploads.filter((f) => f.storageKey !== file.storageKey))}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
