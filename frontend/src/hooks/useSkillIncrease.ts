import { useState } from "react";
import { useAuthState } from "../app/global/AuthContext";
import { useCharacterStore } from "../app/global/characterStore";
import { useToast } from "./use-toast";

/**
 * Thin hook wrapper for skill updates using clean architecture
 *
 * Responsibilities:
 * - UI state management (loading)
 * - Error handling and user feedback (toasts)
 * - Delegation to Application Service through store
 *
 * Following clean architecture principles:
 * - Thin presentation layer
 * - Business logic in Application Service
 * - Proper separation of concerns
 */
export function useSkillIncrease() {
  const toast = useToast();
  const { tokens } = useAuthState();
  const [loading, setLoading] = useState(false);
  const selectedCharacterId = useCharacterStore((state) => state.selectedCharacterId);
  const increaseSkill = useCharacterStore((state) => state.increaseSkill);

  /**
   * Increases a skill with proper UI feedback
   * Delegates business logic to Application Service via store
   */
  const tryIncreaseSkill = async (skillName: string): Promise<boolean> => {
    if (!selectedCharacterId) {
      toast.toast({
        title: "No Character Selected",
        description: "Please select a character before increasing skills",
      variant: "destructive",
    });
    return false;
  }

  if (!tokens?.idToken) {
    toast.toast({
      title: "Authentication Required",
      description: "Please log in to modify characters",
      variant: "destructive",
    });
    return false;
  }

  try {
    setLoading(true);

    // Delegate to Application Service through store
    const success = await increaseSkill(selectedCharacterId, skillName, tokens.idToken);      if (success) {
        toast.toast({
          title: "Skill Increased",
          description: `Successfully increased ${skillName}`,
          variant: "default",
        });
        return true;
      } else {
        toast.toast({
          title: "Skill Increase Failed",
          description: "An error occurred while increasing the skill. Please try again.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      toast.toast({
        title: "Unexpected Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    tryIncreaseSkill,
    loading,
  };
}
