"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { t } from "@lingui/core/macro";
import { Loader2, Pencil } from "lucide-react";
import { adminApi } from "@samofujera/api-client";
import type { EmailTemplateListItem } from "@samofujera/api-client";
import {
  Button,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@samofujera/ui";
import { PageHeader } from "@/components/dashboard/page-header";
import { EditEmailTemplateDialog } from "@/components/admin/emails/edit-email-template-dialog";

export function EmailTemplatesPage() {
  const [editingTemplate, setEditingTemplate] =
    useState<EmailTemplateListItem | null>(null);

  const templatesQuery = useQuery({
    queryKey: ["admin", "email-templates"],
    queryFn: () => adminApi.getEmailTemplates(),
  });

  const templates = templatesQuery.data ?? [];

  return (
    <div className="flex flex-1 flex-col gap-4 sm:gap-6">
      <PageHeader
        title={t`Emaily`}
        subtitle={t`Správa emailových šablon.`}
      />

      {templatesQuery.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : templatesQuery.isError ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-6 text-center text-sm text-destructive">
          {t`Nepodařilo se načíst šablony. Zkuste to prosím znovu.`}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t`Šablona`}</TableHead>
                <TableHead>{t`Jazykové verze`}</TableHead>
                <TableHead>{t`Naposledy upraveno`}</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((tpl) => (
                <TableRow key={tpl.key}>
                  <TableCell className="font-medium">{tpl.nameCzech}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Badge variant={tpl.overrides.cs ? "default" : "outline"}>
                        cs
                      </Badge>
                      <Badge variant={tpl.overrides.sk ? "default" : "outline"}>
                        sk
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {tpl.updatedAt
                      ? new Date(tpl.updatedAt).toLocaleDateString("cs-CZ")
                      : t`—`}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingTemplate(tpl)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {editingTemplate && (
        <EditEmailTemplateDialog
          template={editingTemplate}
          open={editingTemplate !== null}
          onOpenChange={(open) => {
            if (!open) setEditingTemplate(null);
          }}
          onSaved={() => templatesQuery.refetch()}
        />
      )}
    </div>
  );
}
