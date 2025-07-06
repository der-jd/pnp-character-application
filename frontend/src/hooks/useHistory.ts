"use client";

import { useState } from "react";
import { useAuth } from "../app/global/AuthContext";
import { useCharacterStore } from "../app/global/characterStore";
import { ApiError, deleteHistoryEntry, getHistory, getHistoryBlock } from "../lib/api/utils/api_calls";
import { useToast } from "./use-toast";

/**
 * Update hook for the current character's history entries.
 * @returns A loading indicator and a function to update the history of the selected Character
 */
export function useHistory() {
  const toast = useToast();
  const selectedChar = useCharacterStore((state) => state.selectedCharacterId);
  const setHistory = useCharacterStore((state) => state.setHistoryEntries);
  const updateHistoryEntries = useCharacterStore((state) => state.updateHistoryEntries);
  const { idToken } = useAuth();

  const [isLoading, setLoading] = useState<boolean>(false);

  function hasIdToken(idToken: string|null): idToken is string {
    if (!idToken) {
      toast.toast({
        title: `[History Error] No Character!`,
        description: `Please load a character and try again!`,
        variant: "destructive",
      });
      return false;
    }
    return true;
  }
  
  function hasSelectedChar(selectedChar: string|null): selectedChar is string {
    if (!selectedChar) {
      toast.toast({
        title: `[History Error] No Character!`,
        description: `Please load a character and try again!`,
        variant: "destructive",
      });
      return false;
    }
    return true;
  }

  const validateRequest = (): boolean => {
    return hasIdToken(idToken) && hasSelectedChar(selectedChar);
  };

  const updateHistory = async (isBlocking: boolean) => {
    if(!validateRequest()) {
      return;
    }

    const token = idToken!;
    const character = selectedChar!;

    const fetchHistory = async () => {
      try {
        let response = await getHistory(token, character);
        let allChanges = flattenHistory(response);

        while (
          response.previousBlockNumber !== null &&
          response.previousBlockNumber >= 0 &&
          response.previousBlockId !== null
        ) {
          response = await getHistoryBlock(token, character, response.previousBlockNumber);
          allChanges = [...allChanges, ...flattenHistory(response)];
        }

        updateHistoryEntries(allChanges);
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

  const revertHistoryEntry = async (entryId: string): Promise<boolean> => {
    if(entryId == undefined || entryId == "") {
      toast.toast({
        title: `[History Error] No Data!`,
        description: `Entry id missing for revert request!`,
        variant: "destructive",
      });
      return false;
    }

    if(!validateRequest()) {
      return false;
    }

    const token = idToken!;
    const character = selectedChar!;

    setLoading(true);
    try {
      const reply = await deleteHistoryEntry(token, character, entryId);
    } catch (error) {
      if (error instanceof ApiError) {
        toast.toast({
          title: `[History Error] ${error.statusCode}`,
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast.toast({
          title: `[History Error] Unknown`,
          description: `Unexpected error while reverting entry.`,
          variant: "destructive",
        });
      }

      setLoading(false);
      return false;
    }

    setLoading(false);
    return true;
  }

  // const saveHistoryEntry = async (entryId: string): Promise<boolean> => {
  
  // };

  const saveHistory = () => {
    
  }

  return { updateHistory, resetHistory, revertHistoryEntry, isLoading };
}

// Extract all change entries from the block response
function flattenHistory(response: {
  items: {
    changes: any[];
  }[];
}) {
  return response.items.flatMap((item) => item.changes);
}
