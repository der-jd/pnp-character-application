export interface ICombatValue {
  name: string;
  attack: number;
  parry: number;
  handling: string;
  talent: string;
  pointsAvailable: number;
  type: "melee" | "ranged";
}
