import * as React from"react"
import { cn } from"@/lib/utils"

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
 variant?:"circular" |"rectangular" |"text" |"title"
}

function CmmSkeleton({
 className,
 variant ="rectangular",
 ...props
}: SkeletonProps) {
 return (
 <div
 className={cn(
"relative overflow-hidden bg-slate-100/80 dark:bg-slate-800/80 cmm-shimmer",
 {
"rounded-full": variant ==="circular",
"rounded-md": variant ==="rectangular" || variant ==="text" || variant ==="title",
"h-4 w-full": variant ==="text",
"h-5 w-2/3": variant ==="title",
 },
 className
 )}
 {...props}
 />
 )
}

export { CmmSkeleton }
