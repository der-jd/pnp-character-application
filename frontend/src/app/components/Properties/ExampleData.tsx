import { IProperty, IBaseValue, Property, BaseValue } from './PropertiesDefinition'; // assuming enums are here

// Example array for Properties
export const exampleProperties: IProperty[] = [
    { name: Property.COURAGE, level: 5, edited_level: 7 },
    { name: Property.INTELLIGENCE, level: 6, edited_level: 6 },
    { name: Property.CONCENTRATION, level: 8, edited_level: 9 },
    { name: Property.CHARISMA, level: 4, edited_level: 5 },
    { name: Property.MENTAL, level: 7, edited_level: 8 },
    { name: Property.DEXTERITY, level: 6, edited_level: 7 },
    { name: Property.ENDURANCE, level: 9, edited_level: 10 },
    { name: Property.STRENGTH, level: 7, edited_level: 8 },
];

// Example array for Base Values
export const exampleBaseValues: IBaseValue[] = [
    { name: BaseValue.LP, level: 25, mod: 2, edited_level: 27 },
    { name: BaseValue.GG, level: 18, mod: 1, edited_level: 19 },
    { name: BaseValue.INI, level: 12, mod: 3, edited_level: 15 },
    { name: BaseValue.ATK, level: 10, mod: 2, edited_level: 12 },
    { name: BaseValue.PAR, level: 11, mod: 1, edited_level: 12 },
    { name: BaseValue.FK, level: 9, mod: 2, edited_level: 11 },
];
