"use client";

import { useState } from "react";
import { useAuth } from "../app/global/AuthContext";
import { useCharacterStore } from "../app/global/characterStore";
import { CharacterSheet, LearningMethod } from "../lib/api/models/Character/character";
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
      increasedPoints: pointsToSkill,
      learningMethod: LearningMethod[skill.learning_method],
    };

    console.log("calculated values: ");
    console.log(increaseSkillRequest);

    if (selectedChar && idToken) {
      try {
        setLoading(true);
        await increaseSkill(idToken, selectedChar, skill.name, skill.category, increaseSkillRequest);
      } catch (error) {
        if (error instanceof ApiError) {
          toast.toast({
            title: `Error ${error.statusCode}`,
            description: `${error.body}`,
            variant: "destructive",
          });
        }
        setLoading(false);
        return;
      }
    }
    
    setLoading(false);
    updateValue(path, name, skill.current_level + pointsToSkill);
  };

  return { tryIncreaseSkill, loading };
}
