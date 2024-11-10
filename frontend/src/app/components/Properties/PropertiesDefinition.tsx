import { GiMuscleUp } from "react-icons/gi";
import { GiSwordClash } from "react-icons/gi";
import { GiSwordBrandish } from "react-icons/gi";
import { GiPaperArrow } from "react-icons/gi";
import { GiAwareness } from "react-icons/gi";
import { GiGlassHeart } from "react-icons/gi";
import { GiBowArrow } from "react-icons/gi";
import { GiRun } from "react-icons/gi";
import { GiHiveMind } from "react-icons/gi";
import { GiHive } from "react-icons/gi";
import { GiConcentrationOrb } from "react-icons/gi";
import { GiTightrope } from "react-icons/gi";
import { GiArtificialIntelligence } from "react-icons/gi";
import { GiThunderStruck } from "react-icons/gi";



export interface IProperty {
    name: string;
    level: number;
    edited_level: number;
}

export interface IBaseValue {
    name: string,
    level: number,
    mod: number,
    edited_level: number,
}

export enum Property {
    COURAGE = "Mut",
    INTELLIGENCE = "Klugheit",
    CONCENTRATION = "Konzentration",
    CHARISMA = "Charisma",
    MENTAL = "Mentale Belastbarkeit",
    DEXTERITY = "Geschicklichkeit",
    ENDURANCE = "Ausdauer",
    STRENGTH = "Stärke",
}

export enum BaseValue {
    LP = "Lebenspunkte",
    GG = "Geistige Gesundheit",
    INI = "Initiative",
    ATK = "Angriff",
    PAR = "Parieren",
    FK = "Fernkampf",
}


export function render_attribute_icon(attribute: string) {
    switch (attribute) {
        // Property cases
        case Property.COURAGE:          return <GiThunderStruck size={25}/>;
        case Property.INTELLIGENCE:     return <GiArtificialIntelligence size={25}/>;
        case Property.CONCENTRATION:    return <GiConcentrationOrb size={25}/>;
        case Property.CHARISMA:         return <GiHiveMind size={25}/>;
        case Property.MENTAL:           return <GiHive size={25}/>;
        case Property.DEXTERITY:        return <GiTightrope size={25}/>;
        case Property.ENDURANCE:        return <GiRun size={25}/>;
        case Property.STRENGTH:         return <GiMuscleUp size={25}/>;

        // BaseValue cases
        case BaseValue.LP:              return <GiGlassHeart size={25}/>;
        case BaseValue.GG:              return <GiAwareness size={25}/>;
        case BaseValue.INI:             return <GiPaperArrow size={25}/>;
        case BaseValue.ATK:             return <GiSwordBrandish size={25}/>;
        case BaseValue.PAR:             return <GiSwordClash size={25}/>;
        case BaseValue.FK:              return <GiBowArrow size={25}/>;

        default:
            return "Unknown Skill";
    }
}