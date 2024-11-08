export interface Property {
    name: string;
    start: number;
    current: number;
    changed: number;
}

export interface BaseValue {
    name: string,
    current: number,
    mod: number,
    changed: number,
}

export const Properties = {
    COURAGE:       "Mut",
    INTELLIGENCE:  "Klugheit",
    CONCENTRATION: "Konzentration",
    CHARISMA:      "Charisma",
    MENTAL:        "Mentale Belastbarkeit",
    DEXTERITY:     "Geschicklichkeit",
    ENDURANCE:     "Ausdauer",
    STRENGHT:      "Stärke",
}

export const BaseValues = {
    LP:  "Lebenspunkte",
    GG:  "Geistige Gesundheit",
    INI: "Initiative",
    ATK: "Angriff",
    PAR: "Parieren",
    FK:  "Fernkampf"
}