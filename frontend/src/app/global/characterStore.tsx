import { CharacterSheet } from "@/src/lib/api/models/Character/character";
import { AllCharactersCharacter } from "@/src/lib/api/models/allCharacters/interface";
import { getAllCharacters, getCharacter } from "@/src/lib/api/utils/api_calls";
import { create } from "zustand";

export interface CharacterStore {
  availableCharacters: Array<AllCharactersCharacter>;
  selectedCharacterId: string | null;
  isEditable: boolean;
  characterSheet: CharacterSheet | null;

  setCharacterSheet: (data: CharacterSheet) => void;
  setEditable: (isEditable: boolean) => void;
  setSelectedCharacter: (char: string) => void;
  setAvailableCharacters: (chars: Array<AllCharactersCharacter>) => void;

  updateValue: (path: (keyof CharacterSheet)[], name: keyof CharacterSheet, newValue: number) => void;

  updateAvailableCharacters: (idToken: string) => void;
  updateCharacter: (idToken: string, charId: string) => void;
}

const updateCharacterSheet = (sheet: CharacterSheet, path: string[], name: string, newValue: any) => {
  console.log(sheet);
  console.log(path);
  console.log(name);
  return path.reduceRight((acc, key, index, arr) => {
    console.log("_______________")
    console.log(acc);
    console.log(index);
    console.log(arr.length);
    console.log(arr[index]);
    if (index === arr.length - 1) {
      // At deepest level, update the value
      return {
        ...sheet,
        [key]: {
          ...(sheet[key as keyof CharacterSheet] as Record<string, any>),
          [name]: {
            ...(sheet[key as keyof CharacterSheet] as Record<string, object>)[name],
            current: newValue,
          },
        },
      };
    }
    // Rebuild each level as we go back up
    console.log("test");
    return {
      ...sheet,
      [key]: acc,
    };
  }, structuredClone(sheet));
};

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

  setCharacterSheet: (sheet) => set({ characterSheet: { ...sheet } }),
  setEditable: (isEditable) => set({ isEditable }),
  setSelectedCharacter: (char) => set({ selectedCharacterId: char }),
  setAvailableCharacters: (chars) => set({ availableCharacters: [...chars] }),



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
        throw new Error(`No character sheet has been loaded yet, updating value ${name} failed`);
      }

      return {
        characterSheet: updateCharacterSheet(state.characterSheet, path as string[], name, newValue),
      };

    });
  },



  /**
   * Fetches all own and shared characters for the current user and updates the character store
   * 
   * @param idToken The idToken of the user 
   */
  updateAvailableCharacters: async (idToken: string) => {
    try {
      const characters = await getAllCharacters(idToken);
      set(() => ({
        availableCharacters: [...characters.characters],
      }));
    } catch (error) {
      console.log(`[Character store] Error while fetching available characters!`);
    }
  },

  /**
   * Fetches the specified character and updates the character store
   * 
   * @param idToken The idToken provided by cognito
   * @param charId  The character to fetch
   */
  updateCharacter: async (idToken: string, charId: string) => {
    try {
      const character = await getCharacter(idToken, charId);

      set(() => ({
        characterSheet: { ...character.characterSheet },
      }));
    } catch(error) {
      console.log(`[Character store] Error while fetching character data for ${charId}!`);
    }
  },

  /**
   * Updates the currently selected character
   * 
   * @param charId The selected character
   */
  selectCharacter: (charId: string) => { set(() => ({ selectedCharacterId: charId })) },
}));
