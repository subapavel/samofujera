"use client";

import { Badge } from "@samofujera/ui";
import { Clock, Check, Truck, XCircle, FileEdit, Archive } from "lucide-react";
import type { ComponentProps } from "react";

type BadgeVariant = ComponentProps<typeof Badge>["variant"];

interface StatusConfig {
  variant: BadgeVariant;
  icon: typeof Clock;
  label: string;
}

const STATUS_MAP: Record<string, StatusConfig> = {
  PENDING: { variant: "warning", icon: Clock, label: "Čeká" },
  PAID: { variant: "success", icon: Check, label: "Zaplaceno" },
  ACTIVE: { variant: "success", icon: Check, label: "Aktivní" },
  SHIPPED: { variant: "info", icon: Truck, label: "Odesláno" },
  CANCELLED: { variant: "destructive", icon: XCircle, label: "Zrušeno" },
  REFUNDED: { variant: "destructive", icon: XCircle, label: "Vráceno" },
  DRAFT: { variant: "secondary", icon: FileEdit, label: "Koncept" },
  PUBLISHED: { variant: "success", icon: Check, label: "Publikováno" },
  SCHEDULED: { variant: "info", icon: Clock, label: "Naplánováno" },
  ARCHIVED: { variant: "outline", icon: Archive, label: "Archivováno" },
  BLOCKED: { variant: "destructive", icon: XCircle, label: "Blokováno" },
};

interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = STATUS_MAP[status];
  if (!config) {
    return <Badge variant="outline" className={className}>{label ?? status}</Badge>;
  }
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className={className}>
      <Icon className="h-3 w-3" />
      {label ?? config.label}
    </Badge>
  );
}
