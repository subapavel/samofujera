"use client";

import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2 border-b border-golden-200/50 pb-4 dark:border-border">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {children && <div className="flex gap-2">{children}</div>}
    </div>
  );
}
