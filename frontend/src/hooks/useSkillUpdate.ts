"use client";

import { useState, useCallback } from "react";
import { useAuthState } from "../app/global/AuthContext";
import { useCharacterStore } from "../app/global/characterStore";
import { CharacterSheet, LearningMethod, LearningMethodString } from "api-spec";
import type { SkillViewModel } from "../lib/domain/Skills";
import { increaseCombatValue, increaseSkill, levelUp } from "../lib/api/utils/api_calls";
import { ApiError } from "@lib/api/utils/api_calls";
import { useToast } from "./use-toast";
import { SkillIncreaseRequest } from "../lib/api/models/skills/interface";
import { LevelupRequest } from "../lib/api/models/lvlUp/interface";
import { CombatValueIncreaseRequest } from "../lib/api/models/combatValues/interface";
import { ICombatValue } from "../lib/components/ui/combatTable/definitions";

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

/**
 * Hook that provides functionality to update skills, attributes, and other character values via API calls.
 * Handles errors, loading states, and updates the character store with backend responses.
 *
 * CRITICAL: Only subscribes to data, not store functions, to avoid infinite re-render loops.
 *
 * @returns Object containing increase functions and loading state
 */
export function useSkillUpdater() {
  const toast = useToast();
  const { tokens } = useAuthState();
  const [loading, setLoading] = useState(false);

  // IMPORTANT: Only subscribe to data, NOT functions
  // Store functions change their reference on every state update, causing infinite loops
  const selectedChar = useCharacterStore((state) => state.selectedCharacterId);

  // Get characterSheet when needed, don't subscribe to it
  const getCharacterSheet = useCallback(() => useCharacterStore.getState().characterSheet, []);

  // Increase skill with modern SkillViewModel
  const tryIncrease = useCallback(
    async (skill: SkillViewModel, points: number) => {
      if (!selectedChar || !tokens?.idToken) return;

      const request: SkillIncreaseRequest = {
        current: {
          initialValue: skill.currentLevel,
          increasedPoints: points,
        },
        learningMethod: convertLearningMethodToString(skill.learningMethod),
      };

      try {
        setLoading(true);
        const response = await increaseSkill(tokens.idToken, selectedChar, skill.name, skill.category, request);

        // Update the entire skill object from backend
        const characterSheet = getCharacterSheet();
        if (characterSheet) {
          const updatedSheet = { ...characterSheet };
          const categorySkills = updatedSheet.skills[skill.category];
          if (categorySkills) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (categorySkills as any)[skill.name] = response.data.changes.new.skill;
            useCharacterStore.getState().setCharacterSheet(updatedSheet);
          }
        }

        // Update history
        if (response.historyRecord) {
          useCharacterStore.getState().updateOpenHistoryEntries([response.historyRecord]);
        }

        toast.toast({
          title: "Success",
          description: `${skill.displayName} increased to ${response.data.changes.new.skill.current}`,
        });
      } catch (error) {
        if (error instanceof ApiError) {
          toast.toast({
            title: `Error ${error.statusCode}`,
            description: `${error.body}`,
            variant: "destructive",
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [selectedChar, tokens, getCharacterSheet, toast]
  );

  // Level up
  const lvlUp = useCallback(
    async (currentLevel: number) => {
      if (!selectedChar || !tokens?.idToken) return;

      const request: LevelupRequest = {
        initialLevel: currentLevel,
      };

      try {
        setLoading(true);
        const { data, historyRecord } = await levelUp(tokens.idToken, selectedChar, request);

        // Get store functions directly
        const store = useCharacterStore.getState();
        store.updateValue(
          ["generalInformation" as keyof CharacterSheet],
          "level" as keyof CharacterSheet,
          data.level.new.value
        );

        if (historyRecord) {
          store.updateOpenHistoryEntries([historyRecord]);
        }
      } catch (error) {
        if (error instanceof ApiError) {
          toast.toast({
            title: `Error ${error.statusCode}`,
            description: `${error.body}`,
            variant: "destructive",
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [selectedChar, tokens, toast]
  );

  // Increase combat value
  const tryIncreaseCombatValue = useCallback(
    async (value: ICombatValue, subtype: string, pointsToSkill: number) => {
      if (!selectedChar || !tokens?.idToken) return;

      const request: CombatValueIncreaseRequest = {
        attackValue: {
          initialValue: value.attack,
          increasedPoints: subtype === "attack" ? pointsToSkill : 0,
        },
        paradeValue: {
          initialValue: value.parry,
          increasedPoints: subtype === "parry" ? pointsToSkill : 0,
        },
      };

      try {
        setLoading(true);
        const { data, historyRecord } = await increaseCombatValue(
          tokens.idToken,
          selectedChar,
          value.name,
          value.type,
          request
        );

        // Get store functions directly
        const store = useCharacterStore.getState();
        store.updateCombatValue(
          ["combat", value.type] as (keyof CharacterSheet)[],
          value.name as keyof CharacterSheet,
          data.combatStats.new
        );

        if (historyRecord) {
          store.updateOpenHistoryEntries([historyRecord]);
        }
      } catch (error) {
        if (error instanceof ApiError) {
          toast.toast({
            title: `Error ${error.statusCode}`,
            description: `${error.body}`,
            variant: "destructive",
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [selectedChar, tokens, toast]
  );

  return { tryIncrease, lvlUp, tryIncreaseCombatValue, loading };
}
