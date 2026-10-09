import Image from 'next/image'
import { cn } from '@/lib/utils/cn'

/**
 * Site photography. Files live in apps/web/public/images and ship with the
 * deploy — no object storage needed. To swap a picture, replace the file with
 * one of the same name (landscape, ~1600px wide, under 500 KB).
 */
export function Photo({
  src,
  alt,
  className,
  imageClassName,
  priority = false,
  sizes = '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw',
}: {
  src: string
  alt: string
  className?: string
  /** Extra classes on the image itself, e.g. an entrance animation. */
  imageClassName?: string
  priority?: boolean
  sizes?: string
}) {
  return (
    <div className={cn('relative overflow-hidden rounded-[2px] bg-surface-sunken', className)}>
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        // Gentle zoom when the surrounding `group` (a card) is hovered.
        className={cn(
          'object-cover transition-transform duration-[1200ms] ease-out-soft group-hover:scale-[1.05]',
          imageClassName,
        )}
      />
    </div>
  )
}
