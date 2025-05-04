"use client";

import { useState } from "react";
import { useAuth } from "../app/global/AuthContext";
import { useCharacterStore } from "../app/global/characterStore";
import { ApiError, getHistory } from "../lib/api/utils/api_calls";
import { useToast } from "./use-toast";

/**
 * Update hook for the current characters history entries.
 * @returns A loading indicator and a function to update the history of the selected Character
 */
export function useHistory() {
  const toast = useToast();
  const selectedChar = useCharacterStore((state) => state.selectedCharacterId);
  const setHistory = useCharacterStore((state) => state.setHistoryEntries);
  const updateHistoryEntries = useCharacterStore((state) => state.updateHistoryEntries);
  const { idToken } = useAuth();

  const [isLoading, setLoading] = useState<boolean>(false);

  /**
   * Updates the history for the currently selected character either synchronously or asynchronously
   * @param isBlocking Indictates whether the update function should be awaited or not
   */
  const updateHistory = async (isBlocking: boolean) => {
    if (!idToken) {
      toast.toast({
        title: `[History Error] No Credentials!`,
        description: `Please log in and try again!`,
        variant: "destructive",
      });
      return;
    }

    if (!selectedChar) {
      toast.toast({
        title: `[History Error] No Character!`,
        description: `Please load a character and try again!`,
        variant: "destructive",
      });
      return;
    }

    const fetchHistory = async () => {
      try {
        let response = await getHistory(idToken, selectedChar);
        updateHistoryEntries(response.entries);

        while (response.entries[-1]?.number > 0) {
          response = await getHistory(idToken, selectedChar);
          updateHistoryEntries(response.entries);
        }
      } catch (error) {
        if (error instanceof ApiError) {
          toast.toast({
            title: `[History Error] Bad Request!`,
            description: `Request returned ${error.statusCode}: ${error.message}!`,
            variant: "destructive",
          });
        } else {
          toast.toast({
            title: `[History Error] Unknown error`,
            description: `An unknown error occurred, please try again`,
            variant: "destructive",
          });
        }
      }
    };

    if (isBlocking) {
      setLoading(true);
      await fetchHistory();
      setLoading(false);
    } else {
      fetchHistory();
    }
  };

  const resetHistory = () => {
    setHistory([]);
  };

  return { updateHistory, resetHistory, isLoading };
}
