"use client";

import { columns } from "@/src/lib/components/ui/historyTable/columns";
import { DataTable } from "@/src/lib/components/ui/historyTable/dataTable";
import { useCharacterStore } from "../../global/characterStore";
import { useHistoryPageViewModel } from "@/src/hooks/useHistoryPageViewModel";
import { useAuthState } from "../../global/AuthContext";
import { useLoadingOverlay } from "../../global/OverlayContext";
import { useRef, useEffect } from "react";
import { useToast } from "@/src/hooks/use-toast";

export default function History() {
  const hasFetched = useRef(false);
  const characterName = useCharacterStore((state) => state.characterSheet?.generalInformation.name);
  const selectedCharacterId = useCharacterStore((state) => state.selectedCharacterId);
  const { tokens } = useAuthState();
  const { toast } = useToast();
  
  // Use the new ViewModel hook
  const { historyEntries, isLoading, error, loadHistory, clearError } = useHistoryPageViewModel();
  
  const { show, hide } = useLoadingOverlay();

  // Load history on mount
  useEffect(() => {
    console.log("[History Page] Effect running - hasFetched:", hasFetched.current, "selectedCharacterId:", selectedCharacterId, "tokens:", tokens?.idToken ? "present" : "missing");
    if (!hasFetched.current && selectedCharacterId && tokens?.idToken) {
      hasFetched.current = true;
      console.log("[History Page] Calling loadHistory...");
      loadHistory(selectedCharacterId, tokens.idToken);
    }
  }, [selectedCharacterId, tokens?.idToken, loadHistory]);

  // Handle loading overlay
  useEffect(() => {
    if (isLoading) show();
    else hide();
  }, [isLoading, show, hide]);

  // Handle errors with toast notifications
  useEffect(() => {
    if (error) {
      toast({
        title: "[History Error]",
        description: error,
        variant: "destructive",
      });
      clearError();
    }
  }, [error, toast, clearError]);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4 text-center">The Life of {characterName}</h1>
      {(historyEntries?.length ?? 0) > 0 ? (
        <DataTable columns={columns} data={historyEntries ?? []} />
      ) : (
        <p>No history data available.</p>
      )}
    </div>
  );
}
