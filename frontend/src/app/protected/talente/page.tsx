"use client";

import { Button } from "@/components/ui/button";
import { sample_char } from "@/components/Character/sampleCharacter";
import SkillCategory from "@/components/Skill/SkillCategory";
import { extract_properties_data } from "@/components/Skill/SkillDefinitions";
import { useState } from "react";

export default function SkillsPage() {
  const [isEditMode, setEditMode] = useState(false);
  const toggle_edit_mode = () => setEditMode(!isEditMode);

  const discard_values = () => {
    setEditMode(false);
  };

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
      <div className="flex flex-wrap -m-4 rounded-lg w-full p-4">
        <SkillCategory data={extract_properties_data(sample_char.characterSheet)} isEditMode={isEditMode} />
      </div>
    </div>
  );
}
