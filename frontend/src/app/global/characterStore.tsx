import { CharacterSheet } from "@/src/lib/api/models/Character/character";
import { CombatStats } from "api-spec";
import { AllCharactersCharacter } from "@/src/lib/api/models/allCharacters/interface";
import { CharacterService, AuthService, HistoryService } from "@/src/lib/services";
import { CharacterApplicationService } from "@/src/lib/application";
import { Character } from '@/src/lib/domain/Character';
import { create } from "zustand";
import * as R from "ramda";
import { RecordEntry } from "@/src/lib/api/models/history/interface";

function asPath(path: (string | number | symbol)[]): (string | number)[] {
  return path.map((key) => key.toString()); // or key as string
}

// Initialize Application Services following clean architecture
const characterService = new CharacterService();
const authService = new AuthService();
const historyService = new HistoryService();
const characterApplicationService = new CharacterApplicationService(
  characterService,
  historyService,
  authService
);

export interface CharacterStore {
  availableCharacters: Array<AllCharactersCharacter>;
  selectedCharacterId: string | null;
  isEditable: boolean;
  editMode: boolean;
  characterSheet: CharacterSheet | null;
  historyEntries: Array<RecordEntry> | null;
  openHistoryEntries: Array<RecordEntry> | null;

  setCharacterSheet: (data: CharacterSheet) => void;
  setEditable: (isEditable: boolean) => void;
  setSelectedCharacter: (char: string) => void;
  setAvailableCharacters: (chars: Array<AllCharactersCharacter>) => void;
  setHistoryEntries: (entries: Array<RecordEntry>) => void;
  setOpenHistoryEntries: (entries: Array<RecordEntry>) => void;

  updateValue: (path: (keyof CharacterSheet)[], name: keyof CharacterSheet, newValue: number) => void;
  updateCombatValue: (path: (keyof CharacterSheet)[], name: keyof CharacterSheet, combatValue: CombatStats) => void;

  toggleEdit: () => void;

  updateAvailableCharacters: (idToken: string) => void;
  updateCharacter: (idToken: string, charId: string) => void;
  updateHistoryEntries: (newEntries: RecordEntry[]) => void;
  updateOpenHistoryEntries: (newEntries: RecordEntry[]) => void;
  
  // New Application Service methods
  increaseSkill: (characterId: string, skillName: string, idToken: string) => Promise<boolean>;
}

/**
 * CharacterStore to manage the global state of all character related data
 * This updates the character in place after changes made are approved and
 * saved by the backend.
 */
export const useCharacterStore = create<CharacterStore>((set) => ({
  availableCharacters: Array<AllCharactersCharacter>(),
  selectedCharacterId: null,
  isEditable: false,
  characterSheet: null,
  editMode: false,
  historyEntries: null,
  openHistoryEntries: null,

  setCharacterSheet: (sheet) => set({ characterSheet: { ...sheet } }),
  setEditable: (isEditable) => set({ isEditable }),
  setSelectedCharacter: (char) => set({ selectedCharacterId: char }),
  setAvailableCharacters: (chars) => set({ availableCharacters: [...chars] }),
  setHistoryEntries: (entries) => set({ historyEntries: entries }),
  setOpenHistoryEntries: (entries) => set({ openHistoryEntries: entries }),

  /**
   * Reflects the state of the edit button
   */
  toggleEdit: () => {
    set((state) => {
      return { editMode: !state.editMode };
    });
  },

  /**
   * Updates a specified value in the character sheet and updates the value in the character store
   * Note: Updating the character sheet in the store triggers a rerender of components using the sheet
   *
   * @param path The keys to the value in order(!) of key traversal through the object
   * @param name The name of the value to update
   * @param newValue The new value of the value to update
   */
  updateValue: (path: (keyof CharacterSheet)[], name: keyof CharacterSheet, newValue: number) => {
    set((state) => {
      if (!state.characterSheet) {
        throw new Error(`No character sheet has been loaded yet, updating value ${String(name)} failed`);
      }

      const target = R.path([...path, name] as (string | number)[], state.characterSheet);

      const fullPath =
        typeof target === "object" && target !== null && "current" in target
          ? [...path, name, "current"]
          : [...path, name];

      return {
        characterSheet: R.modifyPath(asPath(fullPath), () => newValue, state.characterSheet),
      };
    });
  },

  /**
   * Updates a specified combat value in the character sheet and updates the value in the character store
   * Note: Updating the character sheet in the store triggers a rerender of components using the sheet
   *
   * @param path The keys to the value in order(!) of key traversal through the object
   * @param name The name of the value to update
   * @param newValue The new value of the value to update
   */
  updateCombatValue: (path: (keyof CharacterSheet)[], name: keyof CharacterSheet, newValue: CombatStats) => {
    set((state) => {
      if (!state.characterSheet) {
        throw new Error(`No character sheet has been loaded yet, updating value ${String(name)} failed`);
      }

      const fullPath = [...path, name].map(String);
      console.log(fullPath);
      return {
        characterSheet: R.modifyPath(fullPath, () => newValue, state.characterSheet),
      };
    });
  },

  /**
   * Fetches all own and shared characters for the current user and updates the character store
   * Now uses Application Service for proper clean architecture
   *
   * @param idToken The idToken of the user
   */
  updateAvailableCharacters: async (idToken: string) => {
    // TODO: Use LoadAllCharactersUseCase when implemented
    // For now, use service directly but through application service pattern
    const result = await characterService.getAllCharacters(idToken);
    
    if (result.success) {
      // Convert domain characters back to interface format for compatibility
      const characters = result.data.map(char => ({
        userId: char.userId,
        characterId: char.characterId,
        name: char.name,
        level: char.level
      }));
      
      set(() => ({
        availableCharacters: characters,
      }));
    } else {
      console.error(`[Character store] Error while fetching available characters:`, result.error);
    }
  },

  /**
   * Fetches the specified character and updates the character store
   * Now uses Application Service following clean architecture principles
   *
   * @param idToken The idToken provided by cognito
   * @param charId  The character to fetch
   */
  updateCharacter: async (idToken: string, charId: string) => {
    const result = await characterApplicationService.loadCharacter({
      characterId: charId,
      idToken: idToken
    });
    
    if (result.success) {
      const character = result.data.character;
      set(() => ({
        characterSheet: character.toApiData().characterSheet,
      }));
    } else {
      console.error(`[Character store] Error while fetching character data for ${charId}:`, result.error);
    }
  },

  updateHistoryEntries: (newEntries: RecordEntry[]) => {
    set((state) => ({
      historyEntries: [...(state.historyEntries ?? []), ...newEntries],
    }));
  },

  updateOpenHistoryEntries: (newEntries: RecordEntry[]) => {
    set((state) => ({
      openHistoryEntries: [...(state.openHistoryEntries ?? []), ...newEntries],
    }));
  },

  /**
   * Updates the currently selected character
   *
   * @param charId The selected character
   */
  selectCharacter: (charId: string) => {
    set(() => ({ selectedCharacterId: charId }));
  },

  /**
   * Increases a character's skill using Application Service
   * Returns true if successful, false otherwise
   * Updates the character store with the new data
   *
   * @param characterId The character ID
   * @param skillName The skill name (format: "category.skillName" or just "skillName")
   * @param idToken The authentication token
   */
  increaseSkill: async (characterId: string, skillName: string, idToken: string): Promise<boolean> => {
    const result = await characterApplicationService.increaseSkill({
      characterId,
      skillName,
      idToken
    });

    if (result.success) {
      // Update the character sheet with the new data
      const updatedCharacter = result.data.updatedCharacter;
      set(() => ({
        characterSheet: updatedCharacter.toApiData().characterSheet,
      }));
      
      console.log(`[Character store] Skill '${skillName}' increased successfully. Cost: ${result.data.costCalculation.cost} points`);
      return true;
    } else {
      console.error(`[Character store] Error while increasing skill '${skillName}':`, result.error);
      return false;
    }
  },
}));
