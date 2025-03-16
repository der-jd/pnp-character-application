"use client";

import { Button } from "@lib/components/ui/button";
import { sample_char } from "@/src/lib/api/models/Character/sampleCharacter";
import SkillCategory from "@lib/components/Skill/SkillCategory";
import { extract_properties_data } from "@lib/components/Skill/SkillDefinitions";
import { useState } from "react";

export default function SkillsPage() {
  const [isEditMode, setEditMode] = useState(false);
  const toggle_edit_mode = () => setEditMode(!isEditMode);
  const [characterSheet] = useState(sample_char.characterSheet);

  const discard_values = () => {
    setEditMode(false);
  };

  const fetchCharacter = async () => {};

  return (
    <div className="container mx-auto py-5">
      <div className="space-x-2 py-2">
        <Button
          variant="outline"
          className="bg-black font-bold text-white hover:bg-gray-300 rounded-lg"
          onClick={toggle_edit_mode}
        >
          {isEditMode ? "Save" : "Edit"}
        </Button>
        <Button
          variant="outline"
          className="bg-black font-bold text-white hover:bg-gray-300 rounded-lg"
          onClick={fetchCharacter}
        >
          Get Character
        </Button>
        {isEditMode ? (
          <Button
            variant="outline"
            className="bg-black font-bold text-white hover:bg-gray-300 rounded-lg"
            onClick={discard_values}
          >
            Discard
          </Button>
        ) : null}
      </div>
      <div className="flex flex-wrap rounded-lg w-full p-4">
        <SkillCategory data={extract_properties_data(characterSheet)} isEditMode={isEditMode} />
      </div>
    </div>
  );
}
