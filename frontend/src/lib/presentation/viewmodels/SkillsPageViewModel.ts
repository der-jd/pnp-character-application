import { BaseViewModel } from "./BaseViewModel";
import { featureLogger } from "../../utils/featureLogger";
import { CharacterSheet, Skill } from "api-spec";

/**
 * Skill view model for display
 */
export interface SkillViewModel {
  name: string;
  category: string;
  displayName: string;
  currentLevel: number;
  startLevel: number;
  modifier: number;
  isActivated: boolean;
  totalCost: number;
  defaultCostCategory: number;
}

/**
 * Skills page state
 */
export interface SkillsPageViewModelState {
  characterSheet: CharacterSheet | null;
  editMode: boolean;
  isLoading: boolean;
  error: string | null;
  skillsByCategory: Record<string, SkillViewModel[]>;
}

/**
 * ViewModel for Skills Page
 *
 * Responsibilities:
 * - Manage skills page state
 * - Transform character skills for display
 * - Handle edit mode toggle
 * - Format skill data for UI
 *
 * Following clean architecture principles:
 * - Extends BaseViewModel for reactive state
 * - Separates presentation from business logic
 * - Framework-agnostic implementation
 */
export class SkillsPageViewModel extends BaseViewModel<SkillsPageViewModelState> {
  constructor(characterSheet: CharacterSheet | null = null) {
    super({
      characterSheet,
      editMode: false,
      isLoading: false,
      error: null,
      skillsByCategory: {},
    });

    // Initialize skills if character sheet provided
    if (characterSheet) {
      this.setCharacterSheet(characterSheet);
    }
  }

  /**
   * Set the character sheet and update skills
   */
  setCharacterSheet(characterSheet: CharacterSheet | null): void {
    featureLogger.debug("viewmodel", "SkillsPageViewModel", "Setting character sheet");

    const skillsByCategory = characterSheet ? this.transformAllSkills(characterSheet) : {};

    this.updateState({
      characterSheet,
      skillsByCategory,
    });
  }

  /**
   * Toggle edit mode
   */
  toggleEdit(): void {
    const newEditMode = !this.state.editMode;
    featureLogger.debug("viewmodel", "SkillsPageViewModel", `Toggle edit mode: ${newEditMode}`);

    this.updateState({
      editMode: newEditMode,
    });
  }

  /**
   * Get edit button text
   */
  getEditButtonText(): string {
    return this.state.editMode ? "Save" : "Edit";
  }

  /**
   * Check if character is loaded
   */
  hasCharacter(): boolean {
    return this.state.characterSheet !== null;
  }

  /**
   * Clear error
   */
  clearError(): void {
    this.updateState({ error: null });
  }

  // === Private Helpers ===

  /**
   * Transform all skill categories for display
   */
  private transformAllSkills(characterSheet: CharacterSheet): Record<string, SkillViewModel[]> {
    if (!characterSheet?.skills) {
      return {};
    }

    return {
      combat: this.transformSkillsForCategory("combat", characterSheet.skills.combat),
      body: this.transformSkillsForCategory("body", characterSheet.skills.body),
      social: this.transformSkillsForCategory("social", characterSheet.skills.social),
      nature: this.transformSkillsForCategory("nature", characterSheet.skills.nature),
      knowledge: this.transformSkillsForCategory("knowledge", characterSheet.skills.knowledge),
      handcraft: this.transformSkillsForCategory("handcraft", characterSheet.skills.handcraft),
    };
  }

  /**
   * Transform skills for a specific category
   */
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
      defaultCostCategory: skill.defaultCostCategory as number,
    }));
  }

  /**
   * Format skill name for display
   */
  private formatSkillName(name: string): string {
    return name
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }
}
