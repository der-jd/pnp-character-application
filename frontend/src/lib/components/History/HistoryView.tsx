"use client";

import type { HistoryEntryViewModel } from "@/src/lib/domain/History";
import { HistoryTable } from "./HistoryTable";

interface HistoryViewProps {
  entries: HistoryEntryViewModel[];
  onRevert?: (entryId: string) => Promise<void>;
}

/**
 * Displays history entries in a table format
 * Pure presentational component - no business logic
 */
export function HistoryView({ entries, onRevert }: HistoryViewProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center text-gray-500 py-10">
        <p className="text-lg">No history entries yet</p>
        <p className="text-sm mt-2">Character actions will appear here</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <HistoryTable entries={entries} onRevert={onRevert} />
    </div>
  );
}
