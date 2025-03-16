export interface AllCharactersCharacter {
  userId: string,
  charId: string,
  name: string,
  level: number,
}
  
export interface AllCharactersReply {
  message: string,
  characters: Array<AllCharactersCharacter>
}