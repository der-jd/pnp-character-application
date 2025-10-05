import { useCharacterStore, CharacterStore } from "@/src/app/global/characterStore";
import { useMemo } from "react";
import { SkillViewModel } from "../../domain/Skills";
import { Skill } from "api-spec";

/**
 * ViewModel for Skills Page
 *
 * Responsibilities:
 * - Presentation logic and state management
 * - UI state transformations
 * - Event handling coordination
 * - Data formatting for display
 *
 * Following clean architecture principles:
 * - Separates presentation concerns from business logic
 * - Encapsulates UI state management
 * - Provides clean interface for React components
 */
export class SkillsPageViewModel {
  private _editMode: boolean = false;
  private _isLoading: boolean = false;

  constructor(private readonly characterStore: CharacterStore) {
    this._editMode = characterStore.editMode;
  }

  // === Getters ===
  get editMode(): boolean {
    return this._editMode;
  }

  get isLoading(): boolean {
    return this._isLoading;
  }

  get characterSheet() {
    return this.characterStore.characterSheet;
  }

  get hasCharacterSelected(): boolean {
    return this.characterStore.selectedCharacterId !== null;
  }

  get editButtonText(): string {
    return this._editMode ? "Save" : "Edit";
  }

  // === Computed Properties ===
  get skillsByCategory(): Record<string, SkillViewModel[]> {
    if (!this.characterSheet) {
      return {};
    }

    // Transform character skills using domain logic
    const character = this.characterStore.characterSheet;
    if (!character?.skills) {
      return {};
    }

    return {
      combat: this.transformSkillsForCategory("combat", character.skills.combat),
      body: this.transformSkillsForCategory("body", character.skills.body),
      social: this.transformSkillsForCategory("social", character.skills.social),
      nature: this.transformSkillsForCategory("nature", character.skills.nature),
      knowledge: this.transformSkillsForCategory("knowledge", character.skills.knowledge),
      handcraft: this.transformSkillsForCategory("handcraft", character.skills.handcraft),
    };
  }

  // === Actions ===
  toggleEdit = (): void => {
    if (this._editMode) {
      // Save changes and clear open history entries
      this.characterStore.setOpenHistoryEntries([]);
    }

    this.characterStore.toggleEdit();
    this._editMode = !this._editMode;
  };

  // === Private Helpers ===
  private transformSkillsForCategory(categoryName: string, categorySkills: Record<string, Skill>): SkillViewModel[] {
    if (!categorySkills) return [];

    return Object.entries(categorySkills).map(([skillName, skill]: [string, Skill]) => ({
      name: skillName,
      category: categoryName,
      displayName: this.formatSkillName(skillName),
      currentLevel: skill.current || 0,
      startLevel: skill.start || 0,
      modifier: skill.mod || 0,
      isActivated: skill.activated || false,
      totalCost: skill.totalCost || 0,
      defaultCostCategory: skill.defaultCostCategory || "NORMAL",
    }));
  }

  private formatSkillName(name: string): string {
    return name
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }
}

/**
 * Hook for using SkillsPageViewModel in React components
 * Provides reactive updates and proper lifecycle management
 */
export function useSkillsPageViewModel() {
  const characterStore = useCharacterStore();

  const viewModel = useMemo(
    () => new SkillsPageViewModel(characterStore),
    [characterStore] // Include characterStore in dependency array
  );

  // For now, return the viewModel directly
  // In a more complex setup, you'd implement proper reactivity
  return viewModel;
}
