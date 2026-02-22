"use client";

import { Button } from "@lib/components/ui/button";
import { SkillCategoriesView } from "@/src/lib/components/Skills";
import { useCharacterStore } from "@/src/app/global/characterStore";
import { Character } from "@/src/lib/domain/Character";
import type { SkillViewModel } from "@/src/lib/domain/Skills";
import { useSkillUpdater } from "@/src/hooks/useSkillUpdate";
import { useLoadingOverlay } from "@/src/app/global/OverlayContext";
import { useToast } from "@/src/hooks/use-toast";
import { useMemo, useCallback } from "react";

export default function SkillsPage() {
  const characterSheet = useCharacterStore((state) => state.characterSheet);
  const editMode = useCharacterStore((state) => state.editMode);

  const { show, hide } = useLoadingOverlay();
  const { tryIncrease } = useSkillUpdater();
  const { toast } = useToast();

  // Memoize Character domain object and skills
  // Only recreate when characterSheet reference changes
  const character = useMemo(() => {
    if (!characterSheet) return null;
    return Character.fromApiData({
      userId: "", // Not needed for display
      characterId: "", // Not needed for display
      characterSheet,
    });
  }, [characterSheet]);

  // Memoize skills array - only recreate when character changes
  const allSkills = useMemo(() => {
    if (!character) return [];
    return character.skills.getAllSkills();
  }, [character]);

  // Handle skill increase - delegates to service
  const handleSkillIncrease = useCallback(
    async (skill: SkillViewModel, points: number) => {
      show();
      try {
        await tryIncrease(skill, points);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        toast({
          title: "Error",
          description: `Failed to increase ${skill.displayName}`,
          variant: "destructive",
        });
      } finally {
        hide();
      }
    },
    [show, hide, tryIncrease, toast]
  );

  // Handle skill activation (if needed in future)
  const handleSkillActivate = useCallback(async () => {
    // TODO: Implement skill activation via service if backend supports it
    toast({
      title: "Info",
      description: "Skill activation will be implemented when backend supports it",
    });
  }, [toast]);

  // Toggle edit mode
  const handleToggleEdit = useCallback(() => {
    const store = useCharacterStore.getState();
    store.toggleEdit();
    // Clear history when exiting edit mode
    store.setOpenHistoryEntries([]);
  }, []);

  // Check if character is loaded - AFTER all hooks
  if (!characterSheet) {
    return (
      <div className="container mx-auto py-5">
        <div className="text-center text-gray-500 py-10">
          <p className="text-xl">No character selected</p>
          <p className="text-sm mt-2">Please select a character from the sidebar to view skills</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-5">
      <div className="space-x-2 py-2">
        <Button
          variant="outline"
          className="bg-black font-bold text-white hover:bg-gray-300 hover:text-black rounded-lg"
          onClick={handleToggleEdit}
        >
          {editMode ? "View Mode" : "Edit Mode"}
        </Button>
      </div>
      <div className="flex flex-wrap rounded-lg w-full p-4">
        <SkillCategoriesView
          skills={allSkills}
          isEditMode={editMode}
          onSkillIncrease={handleSkillIncrease}
          onSkillActivate={handleSkillActivate}
        />
      </div>
    </div>
  );
}
