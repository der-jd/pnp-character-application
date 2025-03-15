import { CharacterSheet } from "@/src/lib/api/models/Character/character";
import { create } from "zustand";

export interface CharacterStore {
  availableCharacters: Array<string>;
  selectedCharacter: string | null;
  isEditable: boolean;
  characterSheet: CharacterSheet | null;

  setCharacterSheet: (data: CharacterSheet) => void;
  setEditable: (isEditable: boolean) => void;
  setSelectedCharacter: (char: string) => void;
  setAvailableCharacters: (chars: Array<string>) => void;

  updateValue: (path: (keyof CharacterSheet)[], name: keyof CharacterSheet, newValue: number) => void;

  // loadAllCharacters: () => void;
  // loadCharacter: (id: string) => void;
}

/**
 * CharacterStore to manage the global state of all character related data
 * This updates the character in place after changes made are approved and
 * saved by the backend.
 */
export const useCharacterStore = create<CharacterStore>((set) => ({
  availableCharacters: [],
  selectedCharacter: null,
  isEditable: false,
  characterSheet: null,

  setCharacterSheet: (sheet) => set({ characterSheet: sheet }),
  setEditable: (isEditable) => set({ isEditable }),
  setSelectedCharacter: (char) => set({ selectedCharacter: char }),
  setAvailableCharacters: (chars) => set({ availableCharacters: chars }),

  /**
   * Updates a specified value in the character sheet and updates the value in the character store
   * Note: Updating the character sheet in the store triggers a rerender of components using the sheet
   *
   * @param path The keys to the value in order(!) of key traversal through the object
   * @param name The name of the value to update
   * @param newValue The new value of the value to update
   * @returns The characterSheet which triggers an update for consumers of the charactersheet if the characterSheet is not null
   */
  updateValue: (path: (keyof CharacterSheet)[], name: keyof CharacterSheet, newValue: number) =>
    set((state) => {
      if (!state.characterSheet) {
        throw new Error("No character sheet has been loaded yet, updating value " + name + " failed");
      }

      const updateCharacterSheet = path.reduce<CharacterSheet>((acc, key, index) => {
        // last step, sufficient depth is reached, update the value
        if (index === path.length - 1) {
          if (typeof acc[key] === "object" && acc[key] !== null) {
            return {
              ...acc,
              [key]: {
                ...acc[key as keyof CharacterSheet],
                [name]: {
                  ...(acc[key as keyof CharacterSheet] as Record<string, object>)[name],
                  current: newValue,
                },
              },
            };
          } else {
            throw new Error("Expected an object at " + key + " but found a non-object value");
          }
        }

        // intermediate step, spread the current level if final depth not reached
        return {
          ...acc,
          [key]: {
            ...acc[key],
          },
        };
      }, state.characterSheet as CharacterSheet);

      return { characterSheet: updateCharacterSheet };
    }),
}));
