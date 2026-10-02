import Link from 'next/link'
import { getPublicEnv } from '@crm/config'
import { ImageSlot } from '@/components/public/image-slot'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const env = getPublicEnv()

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-5 py-8 sm:px-10 sm:py-10">
        <Link href="/" className="font-display text-lg tracking-tight sm:text-xl">
          {env.companyName}
        </Link>

        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-sm">{children}</div>
        </div>

        <p className="text-xs text-ink-muted">
          © {new Date().getFullYear()} {env.companyName}
        </p>
      </div>

      {/* Decorative panel — hidden on phones where it would only cost scroll. */}
      <div className="relative hidden lg:block">
        <ImageSlot
          tone="shadow"
          rounded={false}
          label="Studio interior"
          className="absolute inset-0 h-full w-full"
        />
      </div>
    </div>
  )
}
