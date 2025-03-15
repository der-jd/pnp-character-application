"use client";

import { Button } from "@/components/ui/button";
import { sample_char } from "@/components/Character/sampleCharacter";
import SkillCategory from "@/components/Skill/SkillCategory";
import { extract_properties_data } from "@/components/Skill/SkillDefinitions";
import { useState } from "react";
import { useAuth } from "../../global/AuthContext";
import { getCharacter } from "@/lib/Api/character";

export default function SkillsPage() {
  const [isEditMode, setEditMode] = useState(false);
  const toggle_edit_mode = () => setEditMode(!isEditMode);
  const [characterSheet, setCharacterSheet] = useState(sample_char.characterSheet);
  const { idToken } = useAuth();

  const discard_values = () => {
    setEditMode(false);
  };

  const fetchCharacter = async () => {
    try {
      const newCharacter = await getCharacter(idToken, "123e4567-e89b-12d3-a456-426614174000");
      if (newCharacter?.characterSheet) {
        setCharacterSheet(newCharacter.characterSheet);
      }
    } catch (error) {
      console.error("Failed to fetch character:", error);
    }
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
      <div className="flex flex-wrap -m-4 rounded-lg w-full p-4">
        <SkillCategory data={extract_properties_data(characterSheet)} isEditMode={isEditMode} />
      </div>
    </div>
  );
}
