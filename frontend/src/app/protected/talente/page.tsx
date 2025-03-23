"use client";

import { Button } from "@lib/components/ui/button";
import SkillCategory from "@lib/components/Skill/SkillCategory";
import { extract_properties_data } from "@lib/components/Skill/SkillDefinitions";
import { useState, useEffect } from "react";
import { useCharacterStore } from "@global/characterStore";
import { useAuth } from "@global/AuthContext";

export default function SkillsPage() {
  const [isEditMode, setEditMode] = useState(false);
  const toggle_edit_mode = () => setEditMode(!isEditMode);
  const currentCharacterSheet = useCharacterStore((state) => state.characterSheet);
  const updateCharacter = useCharacterStore((state) => state.updateCharacter);
  const selectedCharacterId = useCharacterStore((state) => state.selectedCharacterId);

  const discard_values = () => {
    setEditMode(false);
  };

  const charId = selectedCharacterId;
  const idToken = useAuth().idToken;

  // Sync `characterSheet` state with `currentCharacter`
  useEffect(() => {
    console.log("Character sheet updated:", currentCharacterSheet);
  }, [currentCharacterSheet]);

  const fetchCharacter = async () => {
    if (idToken && charId) {
      await updateCharacter(idToken, charId);
    } else {
      console.log("no id token provided");
      throw new Error("No id token provided");
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
      <div className="flex flex-wrap rounded-lg w-full p-4">
        <SkillCategory data={extract_properties_data(currentCharacterSheet)} isEditMode={isEditMode} />
      </div>
    </div>
  );
}
