"use client";

import { columns } from "@/src/lib/components/ui/historyTable/columns";
import { DataTable } from "@/src/lib/components/ui/historyTable/dataTable";
import sampleData from "@api/models/history/historySample.json";
// import { useCharacterStore } from "../../global/characterStore";
// import { useHistory } from "@/src/hooks/useHistory";
// import { useEffect } from "react";
// import { useLoadingOverlay } from "../../global/OverlayContext";

export default function History() {
  // const characterName = useCharacterStore((state) => state.characterSheet?.generalInformation.name);
  // const { updateHistory, isLoading } = useHistory();
  // const { show, hide } = useLoadingOverlay();

  // const historyData = await updateHistory(true);

  // useEffect(() => {
  //   if (isLoading) {
  //     show();
  //   } else {
  //     hide();
  //   }
  // });

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4 text-center">The Life of {characterName}</h1>
      <DataTable columns={columns} data={sampleData} />
    </div>
  );
}
