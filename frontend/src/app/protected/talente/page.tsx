"use client";

import { Button } from "@lib/components/ui/button";
import SkillCategory from "@lib/components/Skill/SkillCategory";
import { extract_properties_data } from "@lib/components/Skill/SkillDefinitions";
import { useCharacterStore } from "@global/characterStore";

export default function SkillsPage() {
  const currentCharacterSheet = useCharacterStore((state) => state.characterSheet);
  const setOpenHistoryEntries = useCharacterStore((state) => state.setOpenHistoryEntries);
  const changeEdit = useCharacterStore((state) => state.toggleEdit);
  const editMode = useCharacterStore((state) => state.editMode);

  const toggleEdit = () => {
    if (editMode) {
      // TODO use correct function to save history entries
      setOpenHistoryEntries([]);
    }
    changeEdit();
  };
  const isEditMode = useCharacterStore((state) => state.editMode);

  return (
    <div className="container mx-auto py-5">
      <div className="space-x-2 py-2">
        <Button
          variant="outline"
          className="bg-black font-bold text-white hover:bg-gray-300 rounded-lg"
          onClick={toggleEdit}
        >
          {isEditMode ? "Save" : "Edit"}
        </Button>
      </div>
      <div className="flex flex-wrap rounded-lg w-full p-4">
        <SkillCategory data={extract_properties_data(currentCharacterSheet ?? null)} />
      </div>
    </div>
  );
}
