"use client";

import { Button } from "@lib/components/ui/button";
import SkillCategory from "@lib/components/Skill/SkillCategory";
import { extract_properties_data } from "@lib/components/Skill/SkillDefinitions";
import { useSkillsPageViewModel } from "@/src/hooks/useSkillsPageViewModel";

export default function SkillsPage() {
  const { characterSheet, toggleEdit, getEditButtonText, hasCharacter } = useSkillsPageViewModel();

  if (!hasCharacter()) {
    return (
      <div className="container mx-auto py-5">
        <div className="text-center text-gray-500 py-10">
          <p className="text-xl">No character selected</p>
          <p className="text-sm mt-2">Please select a character from the sidebar to view skills</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-5">
      <div className="space-x-2 py-2">
        <Button
          variant="outline"
          className="bg-black font-bold text-white hover:bg-gray-300 rounded-lg"
          onClick={toggleEdit}
        >
          {getEditButtonText()}
        </Button>
      </div>
      <div className="flex flex-wrap rounded-lg w-full p-4">
        <SkillCategory data={extract_properties_data(characterSheet)} />
      </div>
    </div>
  );
}
