"use client"

import { columns } from "@/src/lib/components/ui/historyTable/columns"
import { DataTable } from "@/src/lib/components/ui/historyTable/dataTable"
import sampleData from "@api/models/history/historySample.json" 
import { useCharacterStore } from "../../global/characterStore"

export default function History() {

  const characterName = useCharacterStore((state) => state.characterSheet?.generalInformation.name)

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4 text-center">The Life of {characterName}</h1>
      <DataTable columns={columns} data={sampleData} />
    </div>
  )
}