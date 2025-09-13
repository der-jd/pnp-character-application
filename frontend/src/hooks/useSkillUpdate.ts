"use client";

import { useState } from "react";
import { useAuth } from "../app/global/AuthContext";
import { useCharacterStore } from "../app/global/characterStore";
import { CharacterSheet, LearningMethod, LearningMethodString } from "api-spec";

// Helper function to convert from numeric LearningMethod to string
const convertLearningMethodToString = (numericMethod: LearningMethod): LearningMethodString => {
  switch (numericMethod) {
    case LearningMethod.FREE:
      return "FREE";
    case LearningMethod.LOW_PRICED:
      return "LOW_PRICED";
    case LearningMethod.NORMAL:
      return "NORMAL";
    case LearningMethod.EXPENSIVE:
      return "EXPENSIVE";
    default:
      return "NORMAL";
  }
};
import {
  increaseAttribute,
  increaseBaseValue,
  increaseCombatValue,
  increaseSkill,
  levelUp,
} from "../lib/api/utils/api_calls";
import { ISkillProps } from "../lib/components/Skill/SkillDefinitions";
import { ApiError } from "@lib/api/utils/api_calls";
import { useToast } from "./use-toast";
import { SkillIncreaseRequest } from "../lib/api/models/skills/interface";
import { AttributeIncreaseRequest } from "../lib/api/models/attributes/interface";
import { BaseValueIncreaseRequest } from "../lib/api/models/baseValues/interface";
import { LevelupRequest } from "../lib/api/models/lvlUp/interface";
import { CombatValueIncreaseRequest } from "../lib/api/models/combatValues/interface";
import { ICombatValue } from "../lib/components/ui/combatTable/definitions";

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
  const updateCombatValue = useCharacterStore((state) => state.updateCombatValue);
  const updateReversibleHistory = useCharacterStore((state) => state.updateOpenHistoryEntries);
  const selectedChar = useCharacterStore((state) => state.selectedCharacterId);
  const setCharacterSheet = useCharacterStore((state) => state.setCharacterSheet);
  const characterSheet = useCharacterStore((state) => state.characterSheet);

  function applyUpdate({
    keyPath,
    name,
    newValue,
    historyRecord,
    updatedAdventurePoints,
    updatedAttributePoints,
  }: {
    keyPath: (keyof CharacterSheet)[];
    name: keyof CharacterSheet;
    newValue: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    historyRecord?: any;
    updatedAdventurePoints?: number;
    updatedAttributePoints?: number;
  }) {
    console.log("applyUpdate called with newValue:", newValue);
    if (!characterSheet) {
      toast.toast({
        title: `Error updating ${name}, character sheet not defined!`,
        description: `The character sheet is missing in the store. Please reload the character and try again!`,
        variant: "destructive",
      });
      return;
    }

    const updatedCharacterSheet = { ...characterSheet };

    if (updatedCharacterSheet.calculationPoints) {
      if (updatedAdventurePoints !== undefined) {
        updatedCharacterSheet.calculationPoints.adventurePoints.available = updatedAdventurePoints;
      }
      if (updatedAttributePoints !== undefined) {
        updatedCharacterSheet.calculationPoints.attributePoints.available = updatedAttributePoints;
      }
    }

    setCharacterSheet(updatedCharacterSheet);
    updateValue(keyPath, name, newValue);

    if (!historyRecord) {
      toast.toast({
        title: `Error updating ${name}`,
        description: `History Entry is missing from backend reply!`,
        variant: "destructive",
      });
      return;
    }

    updateReversibleHistory([historyRecord]);
  }

  const tryIncreaseAttribute = async (skill: ISkillProps, pointsToSkill: number) => {
    const path = ["attributes"] as (keyof CharacterSheet)[];
    const name = skill.name as keyof CharacterSheet;
    const increaseAttributeRequest: AttributeIncreaseRequest = {
      current: {
        initialValue: skill.current_level,
        increasedPoints: pointsToSkill,
      },
    };

    if (selectedChar && idToken) {
      try {
        setLoading(true);

        const { data, historyRecord } = await increaseAttribute(
          idToken,
          selectedChar,
          skill.name,
          increaseAttributeRequest,
        );

        applyUpdate({
          keyPath: path,
          name: name,
          newValue: data.changes.new.attribute.current,
          historyRecord: historyRecord,
          updatedAttributePoints: data.attributePoints?.new.available,
        });
      } catch (error) {
        if (error instanceof ApiError) {
          toast.toast({
            title: `Error ${error.statusCode}`,
            description: `${error.body}`,
            variant: "destructive",
          });
        }
        return;
      } finally {
        setLoading(false);
      }
    }
  };

  const tryIncreaseSkill = async (skill: ISkillProps, pointsToSkill: number) => {
    const path = ["skills", skill.category] as (keyof CharacterSheet)[];
    const name = skill.name as keyof CharacterSheet;

    const increaseSkillRequest: SkillIncreaseRequest = {
      current: {
        initialValue: skill.current_level,
        increasedPoints: pointsToSkill,
      },
      learningMethod: convertLearningMethodToString(skill.learning_method),
    };

    if (selectedChar && idToken) {
      try {
        setLoading(true);
        const { data, historyRecord } = await increaseSkill(
          idToken,
          selectedChar,
          skill.name,
          skill.category,
          increaseSkillRequest,
        );

        applyUpdate({
          keyPath: path,
          name: name,
          newValue: data.changes.new.skill.current,
          historyRecord: historyRecord,
          updatedAdventurePoints: data.adventurePoints?.new.available,
        });
      } catch (error) {
        if (error instanceof ApiError) {
          toast.toast({
            title: `Error ${error.statusCode}`,
            description: `${error.body}`,
            variant: "destructive",
          });
        }
        return;
      } finally {
        setLoading(false);
      }
    }
  };

  const tryIncreaseBaseValue = async (value: ISkillProps, pointsToSkill: number) => {
    const path = ["baseValues"] as (keyof CharacterSheet)[];
    const name = value.name as keyof CharacterSheet;
    const increaseBaseValueRequest: BaseValueIncreaseRequest = {
      byLvlUp: {
        initialValue: value.current_level,
        newValue: pointsToSkill,
      },
    };

    if (selectedChar && idToken) {
      try {
        setLoading(true);
        const { data, historyRecord } = await increaseBaseValue(
          idToken,
          selectedChar,
          value.name,
          increaseBaseValueRequest,
        );

        applyUpdate({
          keyPath: path,
          name: name,
          newValue: data.baseValue.new.current,
          historyRecord: historyRecord,
        });
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
      setLoading(false);
    }
  };

  const tryIncrease = async (value: ISkillProps, pointsToSkill: number) => {
    if (value.category == "Attributes") {
      await tryIncreaseAttribute(value, pointsToSkill);
    } else if (value.category == "BaseValues") {
      await tryIncreaseBaseValue(value, pointsToSkill);
    } else {
      await tryIncreaseSkill(value, pointsToSkill);
    }
  };

  const lvlUp = async (currentLevel: number) => {
    const path = ["generalInformation"] as (keyof CharacterSheet)[];
    const name = "level" as keyof CharacterSheet;
    const lvlUpRequest: LevelupRequest = {
      initialLevel: currentLevel,
    };

    if (selectedChar && idToken) {
      try {
        setLoading(true);
        const { data, historyRecord } = await levelUp(idToken, selectedChar, lvlUpRequest);
        try {
          applyUpdate({
            keyPath: path,
            name: name,
            newValue: data.level.new.value,
            historyRecord: historyRecord,
          });
        } catch (e) {
          console.log(e);
        }
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
      setLoading(false);
    }
  };

  const tryIncreaseCombatValue = async (value: ICombatValue, subtype: string, pointsToSkill: number) => {
    console.log(subtype);
    const path = ["combatValues", value.type] as (keyof CharacterSheet)[];
    const name = value.name as keyof CharacterSheet;
    const increaseCombatValueRequest: CombatValueIncreaseRequest = {
      attackValue: {
        initialValue: value.attack,
        increasedPoints: subtype === "attack" ? pointsToSkill : 0,
      },
      paradeValue: {
        initialValue: value.parry,
        increasedPoints: subtype === "parry" ? pointsToSkill : 0,
      },
    };

    if (selectedChar && idToken) {
      try {
        setLoading(true);
        const { data, historyRecord } = await increaseCombatValue(
          idToken,
          selectedChar,
          value.name,
          value.type,
          increaseCombatValueRequest,
        );

        updateCombatValue(path, name, data.combatValues.new);

        if (historyRecord) updateReversibleHistory([historyRecord]);
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
      setLoading(false);
    }
  };

  return { tryIncrease, lvlUp, tryIncreaseCombatValue, loading };
}
