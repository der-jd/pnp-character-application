"use client";

import { useCharacterStore } from "@/src/app/global/characterStore";
import { useSkillUpdater } from "@/src/hooks/useSkillUpdate";
import { CombatStats } from "api-spec";
import { Button } from "@lib/components/ui/button";
import { CombatValueTable } from "@lib/components/ui/combatTable/dataTable";
import { ICombatValue } from "@lib/components/ui/combatTable/definitions";
import { useLoadingOverlay } from "../../global/OverlayContext";

export default function CombatValuesPage() {
  const editMode = useCharacterStore((state) => state.editMode);
  const setEditMode = useCharacterStore((state) => state.toggleEdit);
  const characterSheet = useCharacterStore((state) => state.characterSheet);
  const { tryIncreaseCombatValue } = useSkillUpdater();
  const { show, hide } = useLoadingOverlay();

  const updateCombatValue = async (item: ICombatValue, subtype: string, amount: number) => {
    show();
    await tryIncreaseCombatValue(item, subtype, amount);
    hide();
  };

  const ranged = characterSheet?.combat.ranged;
  const melee = characterSheet?.combat.melee;
  const rangedData = ranged ? transformCombatValuesToRows(ranged, "ranged") : [];
  const meleeData = melee ? transformCombatValuesToRows(melee, "melee") : [];

  return (
    <div className="w-full p-4">
      <div className="flex justify-end mb-4">
        <Button
          onClick={() => setEditMode()}
          variant="outline"
          className="bg-black font-bold text-white hover:bg-gray-300 rounded-lg"
        >
          {editMode ? "Save" : "Edit"}
        </Button>
      </div>

      <CombatValueTable data={meleeData} callback={updateCombatValue} />
      <CombatValueTable data={rangedData} callback={updateCombatValue} />
    </div>
  );
}

function transformCombatValuesToRows(
  input: Record<string, CombatStats>,
  inputType: "ranged" | "melee"
): ICombatValue[] {
  return Object.entries(input).map(([key, values]) => ({
    name: key,
    attack: values.attackValue,
    parry: values.paradeValue,
    pointsAvailable: values.availablePoints,
    handling: "",
    talent: "",
    type: inputType,
  }));
}
