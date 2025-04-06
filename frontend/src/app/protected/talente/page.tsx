"use client";

import { Button } from "@lib/components/ui/button";
import SkillCategory from "@lib/components/Skill/SkillCategory";
import { extract_properties_data } from "@lib/components/Skill/SkillDefinitions";
import { useCharacterStore } from "@global/characterStore";

export default function SkillsPage() {
  const currentCharacterSheet = useCharacterStore((state) => state.characterSheet);
  const toggleEdit = useCharacterStore((state) => state.toggleEdit);
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
        {isEditMode ? (
          <Button
            variant="outline"
            className="bg-black font-bold text-white hover:bg-gray-300 rounded-lg"
            onClick={toggleEdit}
          >
            Discard
          </Button>
        ) : null}
      </div>
      <div className="flex flex-wrap rounded-lg w-full p-4">
        <SkillCategory data={extract_properties_data(currentCharacterSheet ?? null)} isEditMode={isEditMode} />
      </div>
    </div>
  );
}
