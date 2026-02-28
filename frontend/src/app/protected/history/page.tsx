"use client";

import { useCharacterStore } from "@/src/app/global/characterStore";
import { useAuthState } from "@/src/app/global/AuthContext";
import { useLoadingOverlay } from "@/src/app/global/OverlayContext";
import { useToast } from "@/src/hooks/use-toast";
import { HistoryView } from "@/src/lib/components/History";
import { HistoryCollection } from "@/src/lib/domain/History";
import { HistoryService } from "@/src/lib/services/HistoryService";
import { useEffect, useMemo, useCallback, useState } from "react";
import type { Record } from "api-spec";

export default function HistoryPage() {
  const characterSheet = useCharacterStore((state) => state.characterSheet);
  const selectedCharacterId = useCharacterStore((state) => state.selectedCharacterId);
  const updateCharacter = useCharacterStore((state) => state.updateCharacter);
  const { tokens } = useAuthState();
  const { show, hide } = useLoadingOverlay();
  const { toast } = useToast();

  const [historyRecords, setHistoryRecords] = useState<Record[]>([]);

  // Memoize the history collection
  const historyCollection = useMemo(() => {
    return new HistoryCollection(historyRecords);
  }, [historyRecords]);

  // Memoize the history entries view models
  const historyEntries = useMemo(() => {
    return historyCollection.getAllEntries();
  }, [historyCollection]);

  // Load history on mount
  useEffect(() => {
    const loadHistory = async () => {
      if (!selectedCharacterId || !tokens?.idToken) return;

      show();

      try {
        const historyService = new HistoryService();
        const result = await historyService.getHistory(selectedCharacterId, tokens.idToken);

        if (result.success) {
          setHistoryRecords(result.data);
        } else {
          toast({
            title: "Error",
            description: `Failed to load history: ${result.error}`,
            variant: "destructive",
          });
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        toast({
          title: "Error",
          description: "An unexpected error occurred while loading history",
          variant: "destructive",
        });
      } finally {
        hide();
      }
    };

    loadHistory();
  }, [selectedCharacterId, tokens?.idToken]);

  // Handle revert action
  const handleRevert = useCallback(
    async (entryId: string) => {
      if (!selectedCharacterId || !tokens?.idToken) return;

      show();
      try {
        const historyService = new HistoryService();
        const result = await historyService.revertHistoryEntry(selectedCharacterId, entryId, tokens.idToken);

        if (result.success) {
          toast({
            title: "Success",
            description: "History entry reverted successfully",
          });

          // Reload history
          const historyResult = await historyService.getHistory(selectedCharacterId, tokens.idToken);
          if (historyResult.success) {
            setHistoryRecords(historyResult.data);
          }

          // Reload character using the standard method (same as dashboard)
          await updateCharacter(tokens.idToken, selectedCharacterId);
        } else {
          toast({
            title: "Error",
            description: `Failed to revert: ${result.error}`,
            variant: "destructive",
          });
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        toast({
          title: "Error",
          description: "An unexpected error occurred",
          variant: "destructive",
        });
      } finally {
        hide();
      }
    },
    [selectedCharacterId, tokens?.idToken, show, hide, toast, updateCharacter],
  );

  // Check if character is loaded
  if (!characterSheet || !characterSheet.generalInformation) {
    return (
      <div className="flex flex-col h-full">
        <div className="text-center text-gray-500 py-10">
          <p className="text-xl">No character selected</p>
          <p className="text-sm mt-2">Please select a character from the sidebar to view history</p>
        </div>
      </div>
    );
  }

  const characterName = characterSheet.generalInformation.name;

  return (
    <div className="flex flex-col h-full">
      <h1 className="text-3xl font-bold mb-6 text-center">The Life of {characterName}</h1>

      <HistoryView entries={historyEntries} onRevert={handleRevert} />
    </div>
  );
}
