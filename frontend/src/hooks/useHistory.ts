"use client";

import { useState } from "react";
import { useAuthState } from "../app/global/AuthContext";
import { useCharacterStore } from "../app/global/characterStore";
import { ApiError, deleteHistoryEntry, getHistory, getHistoryBlock } from "../lib/api/utils/api_calls";
import { useToast } from "./use-toast";
import { RecordType } from "../lib/api/utils/historyEventType";
import { CharacterSheet } from "../lib/api/models/Character/character";
import { CombatStats } from "api-spec";
import { RecordEntry } from "../lib/api/models/history/interface";

/**
 * Update hook for the current character's history entries.
 * @returns A loading indicator and a function to update the history of the selected Character
 */
export function useHistory() {
  const toast = useToast();
  const selectedChar = useCharacterStore((state) => state.selectedCharacterId);
  const openHistoryEntries = useCharacterStore((state) => state.openHistoryEntries);
  const { tokens } = useAuthState();

  const [isLoading, setLoading] = useState<boolean>(false);

  function hasIdToken(idToken: string | null | undefined): idToken is string {
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

  function hasSelectedChar(selectedChar: string | null): selectedChar is string {
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
    return hasIdToken(tokens?.idToken) && hasSelectedChar(selectedChar);
  };

  const updateHistory = async (isBlocking: boolean) => {
    if (!validateRequest()) {
      return;
    }

    const token = tokens!.idToken;
    const character = selectedChar!;

    const fetchHistory = async () => {
      try {
        let response = await getHistory(token, character);
        let allChanges: RecordEntry[] = flattenHistory(response) as RecordEntry[];

        while (
          response.previousBlockNumber !== null &&
          response.previousBlockNumber >= 0 &&
          response.previousBlockId !== null
        ) {
          response = await getHistoryBlock(token, character, response.previousBlockNumber);
          allChanges = [...allChanges, ...flattenHistory(response)];
        }

        useCharacterStore.getState().updateHistoryEntries(allChanges);
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
    useCharacterStore.getState().setHistoryEntries([]);
  };

  const revertHistoryEntry = async () => {
    const lastEntry = openHistoryEntries?.pop();
    if (lastEntry == undefined) {
      toast.toast({
        title: `[History Error] No Data!`,
        description: `Entry id missing for revert request!`,
        variant: "destructive",
      });
      return false;
    }

    if (!validateRequest()) {
      return false;
    }

    const token = tokens!.idToken;
    const character = selectedChar!;

    setLoading(true);
    try {
      await deleteHistoryEntry(token, character, lastEntry.id);
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
      return;
    }

    setLoading(false);
    useCharacterStore.getState().setOpenHistoryEntries(openHistoryEntries ?? []);

    switch (lastEntry.type) {
      case RecordType.ATTRIBUTE_CHANGED:
        {
          const path = ["attributes"] as (keyof CharacterSheet)[];
          const name = lastEntry.name as keyof CharacterSheet;
          useCharacterStore.getState().updateValue(path, name, lastEntry.data.old.attribute.current);
        }
        break;

      case RecordType.SKILL_CHANGED:
        {
          const path = ["skills", lastEntry.name.split("/")[0]] as (keyof CharacterSheet)[];
          const name = lastEntry.name.split("/")[1] as keyof CharacterSheet;
          useCharacterStore.getState().updateValue(path, name, lastEntry.data.old.skill.current);
        }
        break;

      case RecordType.EVENT_BASE_VALUE:
        {
          const path = ["baseValues"] as (keyof CharacterSheet)[];
          const name = lastEntry.name as keyof CharacterSheet;
          useCharacterStore.getState().updateValue(path, name, lastEntry.data.old.current);
        }
        break;

      case RecordType.EVENT_LEVEL_UP:
        {
          const path = ["generalInformation"] as (keyof CharacterSheet)[];
          const name = "level" as keyof CharacterSheet;
          console.log(lastEntry.data.old);
          useCharacterStore.getState().updateValue(path, name, lastEntry.data.old.value);
        }
        break;

      case RecordType.COMBAT_VALUES_CHANGED: {
        const path = [
          "combat",
          lastEntry.name.toLowerCase().includes("melee") ? "melee" : "ranged",
        ] as (keyof CharacterSheet)[];
        const name = lastEntry.name.split("/")[1] as keyof CharacterSheet;
        useCharacterStore.getState().updateCombatValue(path, name, lastEntry.data.old as CombatStats);
      }
    }
  };

  const discardUnsavedHistory = async () => {
    while (openHistoryEntries && openHistoryEntries.length > 0) {
      await revertHistoryEntry();
    }

    if (!openHistoryEntries || openHistoryEntries.length === 0) {
      toast.toast({
        title: `[History] All entries reverted`,
        description: `No more entries left to revert.`,
        variant: "success",
      });
    }
  };

  // const saveHistoryEntry = async (entryId: string): Promise<boolean> => {

  // };

  return { updateHistory, resetHistory, revertHistoryEntry, discardUnsavedHistory, isLoading };
}

// Extract all change entries from the block response
function flattenHistory(response: {
  items: {
    changes: RecordEntry[];
  }[];
}): RecordEntry[] {
  return response.items.flatMap((item) => item.changes);
}
