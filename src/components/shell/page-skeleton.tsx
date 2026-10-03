import { Skeleton } from "@/components/ui";
export function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="card flex items-center gap-4 p-5"><Skeleton className="size-12 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-5 w-16" /></div></div>)}</div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="card space-y-4 p-6 xl:col-span-2"><Skeleton className="h-4 w-40" />{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        <div className="card space-y-4 p-6"><Skeleton className="h-4 w-32" />{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      </div>
    </div>
  );
}
