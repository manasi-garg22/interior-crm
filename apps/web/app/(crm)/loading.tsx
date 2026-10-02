import { Skeleton, TableSkeleton } from '@/components/ui/states'

export default function CrmLoading() {
  return (
    <div>
      <Skeleton className="h-9 w-56" />
      <Skeleton className="mt-2 h-5 w-72" />
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-24" />
        ))}
      </div>
      <div className="mt-8">
        <TableSkeleton rows={6} />
      </div>
    </div>
  )
}
