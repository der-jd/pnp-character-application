"use client";

import { useState } from "react";
import { useAuth } from "../app/global/AuthContext";
import { useCharacterStore } from "../app/global/characterStore";
import { CharacterSheet, LearningMethod } from "../lib/api/models/Character/character";
import { increaseSkill } from "../lib/api/utils/api_calls";
import { ISkillProps } from "../lib/components/Skill/SkillDefinitions";
import { ApiError } from "@lib/api/utils/api_calls";
import { useToast } from "./use-toast";
import { SkillIncreaseRequest } from "../lib/api/models/attribute/interface";

/**
 * Hook that provides functionallity to update a skill via api call, handles and shows errors and
 * provides a loading state while the api call is pending
 *
 * @returns The tryIncreaseSkill function object and the loading state of the update proccess
 */
export function useSkillUpdater() {
  const toast = useToast();
  const { idToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const updateValue = useCharacterStore((state) => state.updateValue);
  const updateReversibleHistory = useCharacterStore((state) => state.updateOpenHistoryEntries);
  const selectedChar = useCharacterStore((state) => state.selectedCharacterId);
  const setCharacterSheet = useCharacterStore((state) => state.setCharacterSheet);
  const characterSheet = useCharacterStore((state) => state.characterSheet);

  const tryIncreaseSkill = async (skill: ISkillProps, pointsToSkill: number) => {
    const path = ["skills", skill.category] as (keyof CharacterSheet)[];
    const name = skill.name as keyof CharacterSheet;

    const increaseSkillRequest: SkillIncreaseRequest = {
      current: {
        initialValue: skill.current_level,
        increasedPoints: pointsToSkill,
      },
      learningMethod: LearningMethod[skill.learning_method],
    };

    if (selectedChar && idToken) {
      try {
        setLoading(true);
        const response = await increaseSkill(idToken, selectedChar, skill.name, skill.category, increaseSkillRequest);
        console.log(response);
        const { data, historyRecord } = response;

        if (!characterSheet) {
          toast.toast({
            title: `Error increasing ${skill.name} character sheet not defined!`,
            description: `The character sheet is missing in the store. Please reload the character and try again!`,
            variant: "destructive",
          });
          return;
        }

        const updatedCharacterSheet = { ...characterSheet };

        if (data.adventurePoints != undefined && updatedCharacterSheet.calculationPoints != undefined) {
          updatedCharacterSheet.calculationPoints.adventurePoints.available = data.adventurePoints.new.available;
        }

        setCharacterSheet(updatedCharacterSheet);

        if (!historyRecord) {
          toast.toast({
            title: `Error increasing ${skill.name}!`,
            description: `History Entry from the missing from the backend reply!`,
            variant: "destructive",
          });
          return;
        }

        updateReversibleHistory([historyRecord]);
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
