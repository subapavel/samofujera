"use client";

import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        {subtitle && (
          <p className="text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {children && <div className="flex gap-2">{children}</div>}
    </div>
  );
}
