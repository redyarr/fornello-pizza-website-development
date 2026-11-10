import { cn } from '@/lib/utils'

export function Tricolor({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn('flex h-1 w-20 overflow-hidden rounded-full', className)}>
      <span className="flex-1 bg-basil" />
      <span className="flex-1 bg-white" />
      <span className="flex-1 bg-accent" />
    </span>
  )
}
