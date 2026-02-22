"use client";

import { useState, useCallback } from "react";
import { useAuthState } from "../app/global/AuthContext";
import { useCharacterStore } from "../app/global/characterStore";
import { useToast } from "./use-toast";
import type { SkillViewModel } from "../lib/domain/Skills";

/**
 * Hook that provides thin UI wrappers for skill and character updates.
 *
 * Responsibilities:
 * - UI state management (loading)
 * - Error handling and user feedback (toasts)
 * - Delegation to Application Service through store
 *
 * All business logic flows through CharacterApplicationService.
 * This hook handles only React lifecycle and presentation concerns.
 *
 * @returns Object containing update functions and loading state
 */
export function useSkillUpdater() {
  const toast = useToast();
  const { tokens } = useAuthState();
  const [loading, setLoading] = useState(false);

  // IMPORTANT: Only subscribe to data, NOT functions
  // Store functions change their reference on every state update, causing infinite loops
  const selectedChar = useCharacterStore((state) => state.selectedCharacterId);

  /**
   * Increases a skill with full SkillViewModel and points
   * Delegates through store to Application Service
   *
   * @param skill The skill view model containing category, name, and learningMethod
   * @param points The number of points to increase (1, 5, 10, etc.)
   */
  const tryIncrease = useCallback(
    async (skill: SkillViewModel, points: number) => {
      if (!selectedChar) {
        toast.toast({
          title: "No Character Selected",
          description: "Please select a character before increasing skills",
          variant: "destructive",
        });
        return;
      }

      if (!tokens?.idToken) {
        toast.toast({
          title: "Authentication Required",
          description: "Please log in to modify characters",
          variant: "destructive",
        });
        return;
      }

      try {
        setLoading(true);
        // Format skill identifier as "category.skillName" for the use case
        const skillIdentifier = `${skill.category}.${skill.name}`;
        // Delegate to Application Service through store, passing all required info
        const success = await useCharacterStore.getState().increaseSkill(
          selectedChar,
          skillIdentifier,
          points,
          String(skill.defaultCostCategory), // learningMethod/costCategory
          tokens.idToken
        );
        if (success) {
          toast.toast({
            title: "Success",
            description: `${skill.displayName} increased by ${points} point${points !== 1 ? "s" : ""}`,
            variant: "default",
          });
        } else {
          toast.toast({
            title: "Skill Increase Failed",
            description: "An error occurred while increasing the skill",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast.toast({
          title: "Unexpected Error",
          description: error instanceof Error ? error.message : "An unknown error occurred",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [selectedChar, tokens, toast]
  );

  /**
   * Levels up the character, delegating through Application Service
   * TODO: Implement when store method is added
   */
  const lvlUp = useCallback(
    async (currentLevel: number) => {
      if (!selectedChar || !tokens?.idToken) {
        toast.toast({
          title: "Error",
          description: "Character not selected or not authenticated",
          variant: "destructive",
        });
        return;
      }

      try {
        setLoading(true);
        const success = await useCharacterStore.getState().levelUp(selectedChar, currentLevel, tokens.idToken);
        if (success) {
          toast.toast({
            title: "Level Up",
            description: "Character leveled up successfully",
            variant: "default",
          });
        } else {
          toast.toast({
            title: "Level Up Failed",
            description: "An error occurred while leveling up",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast.toast({
          title: "Unexpected Error",
          description: error instanceof Error ? error.message : "An unknown error occurred",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [selectedChar, tokens, toast]
  );

  return { tryIncrease, lvlUp, loading };
}
