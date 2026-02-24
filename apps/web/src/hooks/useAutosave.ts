import { useRef, useCallback, useEffect, useState } from "react";

interface UseAutosaveOptions {
  onSave: () => Promise<void>;
  /** Debounce delay in ms after last change before auto-saving. Default 3000. */
  debounceMs?: number;
  /** Maximum interval in ms between saves when changes keep coming. Default 30000. */
  fallbackMs?: number;
  /** Whether autosave is enabled. Default true. */
  enabled?: boolean;
}

interface UseAutosaveReturn {
  /** Call this whenever editor content changes. */
  markDirty: () => void;
  /** Whether there are unsaved changes. */
  isDirty: boolean;
  /** Whether a save is currently in progress. */
  isSaving: boolean;
  /** Timestamp of the last successful save, or null if never saved. */
  lastSavedAt: Date | null;
  /** Immediately save (clears pending timers). */
  saveNow: () => Promise<void>;
}

export function useAutosave(options: UseAutosaveOptions): UseAutosaveReturn {
  const {
    onSave,
    debounceMs = 3000,
    fallbackMs = 30000,
    enabled = true,
  } = options;

  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Refs to avoid stale closures in timers
  const isDirtyRef = useRef(false);
  const isSavingRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSaveRef = useRef(onSave);

  // Keep onSave ref current
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const clearTimers = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (fallbackTimerRef.current !== null) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  const executeSave = useCallback(async () => {
    if (!isDirtyRef.current || isSavingRef.current) return;

    isSavingRef.current = true;
    setIsSaving(true);
    isDirtyRef.current = false;
    setIsDirty(false);
    clearTimers();

    try {
      await onSaveRef.current();
      setLastSavedAt(new Date());
    } catch {
      // Restore dirty state so the next markDirty or fallback retries
      isDirtyRef.current = true;
      setIsDirty(true);
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [clearTimers]);

  const markDirty = useCallback(() => {
    if (!enabled) return;

    isDirtyRef.current = true;
    setIsDirty(true);

    // Reset debounce timer
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      void executeSave();
    }, debounceMs);

    // Start fallback timer if not already running
    if (fallbackTimerRef.current === null) {
      fallbackTimerRef.current = setTimeout(() => {
        fallbackTimerRef.current = null;
        void executeSave();
      }, fallbackMs);
    }
  }, [enabled, debounceMs, fallbackMs, executeSave]);

  const saveNow = useCallback(async () => {
    clearTimers();
    // Force dirty so executeSave proceeds even if state hasn't flushed yet
    isDirtyRef.current = true;
    setIsDirty(true);
    await executeSave();
  }, [clearTimers, executeSave]);

  // Warn before unload when dirty
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  return { markDirty, isDirty, isSaving, lastSavedAt, saveNow };
}
