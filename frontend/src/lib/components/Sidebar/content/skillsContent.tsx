"use client";

import { useCharacterStore } from "@/src/app/global/characterStore";
import { RecordEntry } from "@/src/lib/api/models/history/interface";
import React from "react";
import { Button } from "../../ui/button";
import { useLoadingOverlay } from "@/src/app/global/OverlayContext";

const SkillHistoryContent: React.FC = () => {
  const historyEntries = useCharacterStore((state) => state.historyEntries);
  const characterSheet = useCharacterStore((state) => state.characterSheet);
  const setHistoryEntries = useCharacterStore((state) => state.setHistoryEntries);
  const { show, hide } = useLoadingOverlay();

  const revert = () => {
    show();
    setTimeout(() => {
      const updatedEntires = historyEntries?.slice(0, -1) ?? [];
      setHistoryEntries(updatedEntires);
      hide();
    }, 300); // TODO remove timeout when async call to history for reverting is ready
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
        <Button onClick={revert} className="bg-black text-white hover:bg-gray-300 hover:text-black px-4 py-2">
          Revert
        </Button>
        <h4 className="mt-4 font-semibold">Changes</h4>

        <div className="flex flex-col gap-4 mt-2">
          {historyEntries?.map((entry: RecordEntry) => (
            <div key={entry.id} className="bg-white p-4 rounded-lg shadow border">
              <div className="text-sm text-gray-500 mb-1">
                #{entry.number} • {new Date(entry.timestamp).toLocaleString()}
              </div>
              <div className="font-medium">{entry.name}</div>
              <div className="text-sm text-gray-700">
                <span className="text-red-500 line-through">{entry.data.old.value}</span> →{" "}
                <span className="text-green-600">{entry.data.new.value}</span>
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
