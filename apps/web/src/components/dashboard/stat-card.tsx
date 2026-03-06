"use client";

import type { ReactNode } from "react";
import { Card, CardContent } from "@samofujera/ui";
import { cn } from "@samofujera/ui";
import { TrendingUp, TrendingDown } from "lucide-react";

type StatCardVariant = "default" | "warm" | "success" | "warning";

const variantStyles: Record<StatCardVariant, { icon: string; border: string }> = {
  default: {
    icon: "bg-primary/10 text-primary",
    border: "border-l-primary",
  },
  warm: {
    icon: "bg-golden-100 text-golden-700",
    border: "border-l-golden-300",
  },
  success: {
    icon: "bg-success text-success-foreground",
    border: "border-l-success",
  },
  warning: {
    icon: "bg-warning text-warning-foreground",
    border: "border-l-warning",
  },
};

interface StatCardProps {
  title: string;
  value: string;
  description?: string;
  icon: ReactNode;
  trend?: number;
  trendLabel?: string;
  variant?: StatCardVariant;
}

export function StatCard({
  title,
  value,
  description,
  icon,
  trend,
  trendLabel,
  variant = "default",
}: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card className={cn("border-l-4 transition-shadow hover:shadow-md", styles.border)}>
      <CardContent className="flex items-start gap-4 p-5">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", styles.icon)}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-1 font-heading text-2xl font-semibold tracking-tight">{value}</p>
          {(description || trend !== undefined) && (
            <div className="mt-1 flex items-center gap-2">
              {trend !== undefined && (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 text-xs font-medium",
                    trend >= 0 ? "text-success-foreground" : "text-destructive",
                  )}
                >
                  {trend >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {trend > 0 ? "+" : ""}{trend}%
                </span>
              )}
              {trendLabel && (
                <span className="text-xs text-muted-foreground">{trendLabel}</span>
              )}
              {description && !trendLabel && (
                <span className="text-xs text-muted-foreground">{description}</span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
