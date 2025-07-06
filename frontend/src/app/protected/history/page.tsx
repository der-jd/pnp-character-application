"use client";

import { columns } from "@/src/lib/components/ui/historyTable/columns";
import { DataTable } from "@/src/lib/components/ui/historyTable/dataTable";
import { useCharacterStore } from "../../global/characterStore";
import { useHistory } from "@/src/hooks/useHistory";
import { useLoadingOverlay } from "../../global/OverlayContext";
import { useRef, useEffect } from "react";

export default function History() {
  const hasFetched = useRef(false);
  const characterName = useCharacterStore((state) => state.characterSheet?.generalInformation.name);
  const historyData = useCharacterStore((state) => state.historyEntries);
  const { updateHistory, isLoading } = useHistory();
  const { show, hide } = useLoadingOverlay();

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      updateHistory(true);
    }
  }, [updateHistory]);

  useEffect(() => {
    if (isLoading) show();
    else hide();
  }, [isLoading, show, hide]);

  console.log(historyData);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4 text-center">The Life of {characterName}</h1>
      {(historyData?.length ?? 0) > 0 ? (
        <DataTable columns={columns} data={historyData} />
      ) : (
        <p>No history data available.</p>
      )}
    </div>
  );
}
