export interface AllCharactersCharacter {
  userId: string;
  characterId: string;
  name: string;
  level: number;
}

export interface AllCharactersReply {
  characters: Array<AllCharactersCharacter>;
}
