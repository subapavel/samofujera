"use client";

import { useState, type ReactNode } from "react";
import { t } from "@lingui/core/macro";
import { Button } from "@samofujera/ui";

interface SettingsItemProps {
  title: string;
  value: string;
  description?: string;
  children: () => ReactNode;
  onSave?: () => void | Promise<void>;
  onEdit?: () => void;
  onCancel?: () => void;
  isSaving?: boolean;
  isLast?: boolean;
}

export function SettingsItem({
  title,
  value,
  description,
  children,
  onSave,
  onEdit,
  onCancel,
  isSaving,
  isLast,
}: SettingsItemProps) {
  const [isEditing, setIsEditing] = useState(false);

  function handleEdit() {
    onEdit?.();
    setIsEditing(true);
  }

  function handleCancel() {
    onCancel?.();
    setIsEditing(false);
  }

  async function handleSave() {
    if (onSave) {
      await onSave();
    }
    setIsEditing(false);
  }

  return (
    <div className={!isLast ? "border-b border-border pb-6" : ""}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="text-sm font-semibold">{title}</h4>
          {isEditing ? (
            <div className="mt-3 space-y-3">
              {children()}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? t`Ukládání...` : t`Uložit`}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  {t`Zrušit`}
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">{value}</p>
          )}
          {description && (
            <p className="mt-2 text-xs text-muted-foreground/70">
              {description}
            </p>
          )}
        </div>
        {!isEditing && (
          <Button variant="link" size="sm" onClick={handleEdit} className="shrink-0">
            {t`Upravit`}
          </Button>
        )}
      </div>
    </div>
  );
}

interface SettingsSectionProps {
  title: string;
  children: ReactNode;
}

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="mb-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-6">{children}</div>
    </div>
  );
}
