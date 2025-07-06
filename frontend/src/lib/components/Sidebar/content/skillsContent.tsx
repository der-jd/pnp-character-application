"use client";

import { useCharacterStore } from "@/src/app/global/characterStore";
import { RecordEntry } from "@/src/lib/api/models/history/interface";
import React from "react";
import { Button } from "../../ui/button";
import { useLoadingOverlay } from "@/src/app/global/OverlayContext";
import { useHistory } from "@/src/hooks/useHistory";
import { useToast } from "@/src/hooks/use-toast";
import { CharacterSheet } from "@/src/lib/api/models/Character/character";


const SkillHistoryContent: React.FC = () => {
  const historyEntries = useCharacterStore((state) => state.openHistoryEntries);
  const characterSheet = useCharacterStore((state) => state.characterSheet);
  const updateValue = useCharacterStore((state) => state.updateValue);
  const setOpenHistoryEntries = useCharacterStore((state) => state.setOpenHistoryEntries);
  const { show, hide } = useLoadingOverlay();
  const { revertHistoryEntry } = useHistory();
  const toast = useToast();
  

  const revert = async () => {
    show();
    let result = true;
    const lastEntry = historyEntries?.pop();
    if(lastEntry) {
      const revertOk = await revertHistoryEntry(lastEntry.id);
      if(revertOk) {
        const path = ["skills", lastEntry.name.split("/")[0]] as (keyof CharacterSheet)[];
        const name = lastEntry.name.split("/")[1] as keyof CharacterSheet;
        updateValue(path, name, lastEntry.data.old.skill.current);
        setOpenHistoryEntries(historyEntries ?? []);
      }

      else {
        result = false;
      }
    }

    else {
      toast.toast({
        title: `[History Error] No Entries!`,
        description: `No Entries to revert for current character!`,
        variant: "destructive",
      });

      result = false;
    }
    
    hide();
    return result;
  };

  const discard = async () => {
    show();

    while (historyEntries && historyEntries.length > 0) {
      await revert();
    }

    if (!historyEntries || historyEntries.length === 0) {
      toast.toast({
        title: `[History] All entries reverted`,
        description: `No more entries left to revert.`,
        variant: "success",
      });
    }

    hide();
  };

  return (
    <div className="p-4 bg-grey-300 shadow-md rounded-lg">
      <div className="p-4">
        <div className="mt-4 font-semibold">
          AdventurePoints: {characterSheet?.calculationPoints?.adventurePoints.available ?? "N/A"} Attribute Points:{" "}
          {characterSheet?.calculationPoints?.attributePoints.available ?? "N/A"}
        </div>
      </div>

      <div className="p-4">
        <div className="flex gap-4">
          <Button onClick={revert} className="bg-black text-white hover:bg-gray-300 hover:text-black px-4 py-2">
            Revert
          </Button>
          <Button onClick={discard} className="bg-black text-white hover:bg-gray-300 hover:text-black px-4 py-2">
            Revert all
          </Button>
        </div>
        <h4 className="mt-4 font-semibold">Changes</h4>

        <div className="flex flex-col gap-4 mt-2">
          {historyEntries?.map((entry: RecordEntry) => (
            <div key={entry.id} className="bg-white p-4 rounded-lg shadow border">
              <div className="text-sm text-gray-500 mb-1">
                #{entry.number} • {new Date(entry.timestamp).toLocaleString()}
              </div>
              <div className="font-medium">{entry.name}</div>
              <div className="text-sm text-gray-700">
                <span className="text-red-500 line-through">{entry.data.old.skill.current}</span> →{" "}
                <span className="text-green-600">{entry.data.new.skill.current}</span>
              </div>
              {entry.comment && <div className="text-xs text-gray-500 mt-2 italic">{entry.comment}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SkillHistoryContent;
