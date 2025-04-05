"use client";

import { useState } from "react";
import { useAuth } from "../app/global/AuthContext";
import { useCharacterStore } from "../app/global/characterStore";
import { CharacterSheet } from "../lib/api/models/Character/character";
import { increaseSkill } from "../lib/api/utils/api_calls";
import { ISkillProps } from "../lib/components/Skill/SkillDefinitions";
import { ApiError } from "@lib/api/utils/api_calls";
import { useToast } from "./use-toast";

/**
 * Hook that provides functionallity to update a skill via api call, handles and shows errors and
 * provides a loading state while the api call is pending
 *
 * @returns The tryIncreaseSkill function object and the loading state of the update proccess
 */
export function useSkillUpdater() {
  const { idToken } = useAuth();

  const [loading, setLoading] = useState(false);

  const selectedChar = useCharacterStore((state) => state.selectedCharacterId);
  const updateValue = useCharacterStore((state) => state.updateValue);

  const toast = useToast();

  const tryIncreaseSkill = async (skill: ISkillProps, pointsToSkill: number) => {
    const path = ["skills", skill.category] as (keyof CharacterSheet)[];
    const name = skill.name as keyof CharacterSheet;

    const increaseSkillRequest = {
      initialValue: skill.current_level,
      increasedPoints: skill.edited_level - skill.current_level,
      learningMethod: String(skill.learning_method),
    };

    if (selectedChar && idToken) {
      try {
        setLoading(true);
        await increaseSkill(idToken, selectedChar, skill.name, skill.category, increaseSkillRequest);
      } catch (error) {
        console.log("API ERROR IN UPDATER!!!!");
        console.log(error);
        if (error instanceof ApiError) {
          toast.toast({
            title: `Error ${error.statusCode}`,
            description: `${error.body}`,
            variant: "destructive",
          });
        }
      }
    }

    setLoading(false);
    updateValue(path, name, pointsToSkill);
  };

  return { tryIncreaseSkill, loading };
}
