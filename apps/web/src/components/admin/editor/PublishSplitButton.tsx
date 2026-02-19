"use client";

import { useState } from "react";
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@samofujera/ui";
import { ChevronDown } from "lucide-react";

interface PublishSplitButtonProps {
  status: string;
  scheduledPublishAt: string | null;
  onPublish: () => void;
  onUnpublish: () => void;
  onSchedule: (date: string) => void;
  onCancelSchedule: () => void;
}

function formatScheduledDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PublishSplitButton({
  status,
  scheduledPublishAt,
  onPublish,
  onUnpublish,
  onSchedule,
  onCancelSchedule,
}: PublishSplitButtonProps) {
  const [showScheduleInput, setShowScheduleInput] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");

  const isDraft = status === "DRAFT";
  const isPublished = status === "PUBLISHED";
  const isScheduled = isDraft && scheduledPublishAt !== null;

  function handleConfirmSchedule() {
    if (scheduleDate) {
      onSchedule(new Date(scheduleDate).toISOString());
      setShowScheduleInput(false);
      setScheduleDate("");
    }
  }

  function getMainButtonText(): string {
    if (isPublished) return "Publikováno";
    if (isScheduled) return `Naplánováno: ${formatScheduledDate(scheduledPublishAt!)}`;
    return "Publikovat";
  }

  function handleMainClick() {
    if (isDraft && !isScheduled) {
      onPublish();
    }
  }

  return (
    <div className="flex">
      <Button
        variant="outline"
        size="sm"
        className={`rounded-r-none ${isPublished ? "border-green-300 bg-green-50 text-green-700" : ""}`}
        onClick={handleMainClick}
        disabled={isPublished}
      >
        {getMainButtonText()}
      </Button>
      <DropdownMenu
        onOpenChange={(open) => {
          if (!open) {
            setShowScheduleInput(false);
          }
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="rounded-l-none border-l-0 px-1.5">
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isDraft && !isScheduled && (
            <>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setShowScheduleInput(true);
                }}
              >
                Naplánovat publikování
              </DropdownMenuItem>
              {showScheduleInput && (
                <div className="px-2 py-2">
                  <input
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="mb-2 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-sm"
                  />
                  <Button size="sm" className="w-full" onClick={handleConfirmSchedule} disabled={!scheduleDate}>
                    Potvrdit
                  </Button>
                </div>
              )}
            </>
          )}
          {isDraft && isScheduled && (
            <>
              <DropdownMenuItem onSelect={() => onPublish()}>
                Publikovat nyní
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setShowScheduleInput(true);
                }}
              >
                Změnit datum
              </DropdownMenuItem>
              {showScheduleInput && (
                <div className="px-2 py-2">
                  <input
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="mb-2 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-sm"
                  />
                  <Button size="sm" className="w-full" onClick={handleConfirmSchedule} disabled={!scheduleDate}>
                    Potvrdit
                  </Button>
                </div>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onCancelSchedule()}>
                Zrušit naplánování
              </DropdownMenuItem>
            </>
          )}
          {isPublished && (
            <DropdownMenuItem onSelect={() => onUnpublish()}>
              Zrušit publikaci
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
