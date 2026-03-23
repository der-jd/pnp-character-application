import { create } from "zustand";

interface CharacterStoreState {
  selectedCharacterId: string | null;
  setSelectedCharacterId: (id: string | null) => void;
}

export const useCharacterStore = create<CharacterStoreState>((set) => ({
  selectedCharacterId: null,
  setSelectedCharacterId: (id) => set({ selectedCharacterId: id }),
}));
