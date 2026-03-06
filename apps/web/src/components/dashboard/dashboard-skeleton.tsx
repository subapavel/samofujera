"use client";

import { Card, CardContent, Skeleton } from "@samofujera/ui";
import { cn } from "@samofujera/ui";

export function StatCardSkeleton() {
  return (
    <Card className="border-l-4 border-l-border">
      <CardContent className="flex items-start gap-4 p-5">
        <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-3 w-32" />
        </div>
      </CardContent>
    </Card>
  );
}

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function TableSkeleton({ rows = 5, columns = 4, className }: TableSkeletonProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex gap-4 border-b pb-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-4 py-2">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton
              key={colIdx}
              className="h-4 flex-1"
              style={{ opacity: 1 - rowIdx * 0.12 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

interface CardGridSkeletonProps {
  count?: number;
  columns?: number;
  className?: string;
}

export function CardGridSkeleton({ count = 4, columns = 2, className }: CardGridSkeletonProps) {
  return (
    <div
      className={cn("grid gap-4", className)}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="space-y-3 p-5">
            <Skeleton className="h-32 w-full rounded-md" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
