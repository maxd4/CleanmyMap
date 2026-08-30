import * as React from "react"
import { cn } from "@/lib/utils"

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "circular" | "rectangular" | "text" | "title" | "stat" | "card" | "chart" | "list-item"
  animation?: "pulse" | "shimmer" | "none"
}

function CmmSkeleton({
  className,
  variant = "rectangular",
  animation = "shimmer",
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn("cmm-skeleton", className)}
      data-skeleton-variant={variant}
      data-skeleton-animation={animation}
      {...props}
    />
  )
}

function SkeletonStat({ className }: SkeletonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <CmmSkeleton variant="stat" />
      <CmmSkeleton variant="text" className="w-1/2" />
    </div>
  )
}

function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn("space-y-3 p-4", className)}>
      <div className="flex items-center gap-3">
        <CmmSkeleton variant="circular" className="w-10 h-10" />
        <div className="space-y-1 flex-1">
          <CmmSkeleton variant="text" className="w-1/3" />
          <CmmSkeleton variant="text" className="w-1/2" />
        </div>
      </div>
      <CmmSkeleton variant="text" className="w-full" />
      <CmmSkeleton variant="text" className="w-2/3" />
    </div>
  )
}

function SkeletonChart({ className }: SkeletonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <CmmSkeleton variant="chart" />
    </div>
  )
}

function SkeletonList({ count = 3, className }: { count?: number } & SkeletonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {[...Array(count)].map((_, i) => (
        <CmmSkeleton key={i} variant="list-item" />
      ))}
    </div>
  )
}

function SkeletonGrid({ count = 4, className }: { count?: number } & SkeletonProps) {
  return (
    <div className={cn("grid gap-4", className)}>
      {[...Array(count)].map((_, i) => (
        <CmmSkeleton key={i} variant="card" />
      ))}
    </div>
  )
}

export { CmmSkeleton, SkeletonStat, SkeletonCard, SkeletonChart, SkeletonList, SkeletonGrid }
