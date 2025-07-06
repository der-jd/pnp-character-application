"use client";

import { useCharacterStore } from "@/src/app/global/characterStore";
import { RecordEntry } from "@/src/lib/api/models/history/interface";
import React from "react";
import { Button } from "../../ui/button";
import { useLoadingOverlay } from "@/src/app/global/OverlayContext";
import { useHistory } from "@/src/hooks/useHistory";

const SkillHistoryContent: React.FC = () => {
  const historyEntries = useCharacterStore((state) => state.openHistoryEntries);
  const characterSheet = useCharacterStore((state) => state.characterSheet);
  const { show, hide } = useLoadingOverlay();
  const { revertHistoryEntry, discardUnsavedHistory } = useHistory();

  const revert = async () => {
    show();
    await revertHistoryEntry();
    hide();
  };

  const discard = async () => {
    show();
    await discardUnsavedHistory();
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
          {historyEntries?.map((entry: RecordEntry) => {
            const [, oldValue] = Object.entries(entry.data.old)[0] as [string, { current: number }];
            const [, newValue] = Object.entries(entry.data.new)[0] as [string, { current: number }];

            return (
              <div key={entry.id} className="bg-white p-4 rounded-lg shadow border">
                <div className="text-sm text-gray-500 mb-1">
                  #{entry.number} • {new Date(entry.timestamp).toLocaleString()}
                </div>
                <div className="font-medium">{entry.name}</div>
                <div className="text-sm text-gray-700">
                  <span className="text-red-500 line-through">{oldValue.current}</span> →{" "}
                  <span className="text-green-600">{newValue.current}</span>
                </div>
                {entry.comment && <div className="text-xs text-gray-500 mt-2 italic">{entry.comment}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SkillHistoryContent;
