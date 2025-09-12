import { v4 as uuidv4 } from "uuid";
import {
  Attribute,
  BaseValue,
  CharacterSheet,
  CombatValues,
  Skill,
  ATTRIBUTE_POINTS_FOR_CREATION,
  MIN_LEVEL,
  START_SKILLS,
  SkillName,
  combatSkills,
  BodySkillName,
  SocialSkillName,
  NatureSkillName,
  KnowledgeSkillName,
  HandcraftSkillName,
  GeneralInformation,
  PROFESSION_SKILL_BONUS,
  HOBBY_SKILL_BONUS,
  AttributesForCreation,
  PostCharactersRequest,
  Character,
} from "api-spec";
import { COST_CATEGORY_COMBAT_SKILLS, COST_CATEGORY_DEFAULT } from "./constants.js";
import { getAttribute, getSkill } from "../character-utils.js";
import { HttpError, logAndEnsureHttpError } from "../errors.js";

export class CharacterBuilder {
  private characterSheet: CharacterSheet;
  private attributesSet = false;
  private generalInfoSet = false;
  private skillsActivated = false;
  private userId?: string;

  constructor() {
    this.characterSheet = {
      generalInformation: {
        name: "",
        level: MIN_LEVEL,
        sex: "",
        profession: { name: "", skill: "{skillCategory}/{skillName}" },
        hobby: { name: "", skill: "<skillCategory/{skillName}" },
        birthday: "",
        birthplace: "",
        size: "",
        weight: "",
        hairColor: "",
        eyeColor: "",
        residence: "",
        appearance: "",
        specialCharacteristics: "",
      },
      calculationPoints: {
        adventurePoints: { start: 0, available: 0, total: 0 },
        attributePoints: {
          start: ATTRIBUTE_POINTS_FOR_CREATION,
          available: 0,
          total: ATTRIBUTE_POINTS_FOR_CREATION,
        },
      },
      advantages: [],
      disadvantages: [],
      specialAbilities: [],
      baseValues: {
        healthPoints: this.zeroBaseValue(),
        mentalHealth: this.zeroBaseValue(),
        armorLevel: this.zeroBaseValue(),
        naturalArmor: this.zeroBaseValue(),
        initiativeBaseValue: this.zeroBaseValue(),
        attackBaseValue: this.zeroBaseValue(),
        paradeBaseValue: this.zeroBaseValue(),
        rangedAttackBaseValue: this.zeroBaseValue(),
        luckPoints: this.zeroBaseValue(),
        bonusActionsPerCombatRound: this.zeroBaseValue(),
        legendaryActions: this.zeroBaseValue(),
      },
      attributes: {
        courage: this.zeroAttribute(),
        intelligence: this.zeroAttribute(),
        concentration: this.zeroAttribute(),
        charisma: this.zeroAttribute(),
        mentalResilience: this.zeroAttribute(),
        dexterity: this.zeroAttribute(),
        endurance: this.zeroAttribute(),
        strength: this.zeroAttribute(),
      },
      skills: {
        combat: this.createSkillObjectsFromSkillNamesArray(combatSkills) as CharacterSheet["skills"]["combat"],
        body: this.createSkillObjectsFromSkillNamesArray(this.getBodySkillNames()) as CharacterSheet["skills"]["body"],
        social: this.createSkillObjectsFromSkillNamesArray(
          this.getSocialSkillNames(),
        ) as CharacterSheet["skills"]["social"],
        nature: this.createSkillObjectsFromSkillNamesArray(
          this.getNatureSkillNames(),
        ) as CharacterSheet["skills"]["nature"],
        knowledge: this.createSkillObjectsFromSkillNamesArray(
          this.getKnowledgeSkillNames(),
        ) as CharacterSheet["skills"]["knowledge"],
        handcraft: this.createSkillObjectsFromSkillNamesArray(
          this.getHandcraftSkillNames(),
        ) as CharacterSheet["skills"]["handcraft"],
      },
      combatValues: {
        melee: {
          martialArts: this.zeroCombatValues(),
          barehanded: this.zeroCombatValues(),
          chainWeapons: this.zeroCombatValues(),
          daggers: this.zeroCombatValues(),
          slashingWeaponsSharp1h: this.zeroCombatValues(),
          slashingWeaponsBlunt1h: this.zeroCombatValues(),
          thrustingWeapons1h: this.zeroCombatValues(),
          slashingWeaponsSharp2h: this.zeroCombatValues(),
          slashingWeaponsBlunt2h: this.zeroCombatValues(),
          thrustingWeapons2h: this.zeroCombatValues(),
        },
        ranged: {
          missile: this.zeroCombatValues(),
          firearmSimple: this.zeroCombatValues(),
          firearmMedium: this.zeroCombatValues(),
          firearmComplex: this.zeroCombatValues(),
          heavyWeapons: this.zeroCombatValues(),
        },
      },
    };
  }

  private zeroAttribute(): Attribute {
    return { start: 0, current: 0, mod: 0, totalCost: 0 };
  }

  private zeroBaseValue(): BaseValue {
    return { start: 0, current: 0, mod: 0 }; // TODO by formula and byLvlUp. See baseValueFormulas and baseValuesNotUpdatableByLvlUp
  }

  private zeroSkill(skillName: SkillName): Skill {
    return {
      activated: START_SKILLS.includes(skillName) ? true : false,
      start: 0,
      current: 0,
      mod: 0,
      totalCost: 0,
      defaultCostCategory: combatSkills.includes(skillName) ? COST_CATEGORY_COMBAT_SKILLS : COST_CATEGORY_DEFAULT,
    };
  }

  private zeroCombatValues(): CombatValues {
    return {
      availablePoints: 0,
      attackValue: 0,
      paradeValue: 0,
    };
  }

  private createSkillObjectsFromSkillNamesArray(skillNames: readonly SkillName[]) {
    return Object.fromEntries(skillNames.map((name) => [name, this.zeroSkill(name)]));
  }

  private getBodySkillNames(): BodySkillName[] {
    return Object.keys({} as CharacterSheet["skills"]["body"]) as BodySkillName[];
  }
  private getSocialSkillNames(): SocialSkillName[] {
    return Object.keys({} as CharacterSheet["skills"]["social"]) as SocialSkillName[];
  }
  private getNatureSkillNames(): NatureSkillName[] {
    return Object.keys({} as CharacterSheet["skills"]["nature"]) as NatureSkillName[];
  }
  private getKnowledgeSkillNames(): KnowledgeSkillName[] {
    return Object.keys({} as CharacterSheet["skills"]["knowledge"]) as KnowledgeSkillName[];
  }
  private getHandcraftSkillNames(): HandcraftSkillName[] {
    return Object.keys({} as CharacterSheet["skills"]["handcraft"]) as HandcraftSkillName[];
  }

  setAttributes(attributes: AttributesForCreation): this {
    console.log("Set attributes");

    let spentAttributePoints = 0;
    for (const [attr, value] of Object.entries(attributes)) {
      const attribute = getAttribute(this.characterSheet.attributes, attr);
      attribute.start = value.current;
      attribute.current = value.current;
      attribute.mod = value.mod;
      attribute.totalCost = value.current;
      spentAttributePoints += attribute.totalCost;
    }
    if (spentAttributePoints !== ATTRIBUTE_POINTS_FOR_CREATION) {
      throw new HttpError(
        400,
        `Expected ${ATTRIBUTE_POINTS_FOR_CREATION} distributed attribute points, but got ${spentAttributePoints} points.`,
      );
    }
    this.attributesSet = true;
    return this;
  }

  setGeneralInformation(generalInformation: GeneralInformation): this {
    const setupSkill = (skillString: string, bonus: number, type: string) => {
      console.log(`Set up ${type} with skill '${skillString}' and bonus ${bonus}`);

      const [skillCategory, skillName] = skillString.split("/");
      try {
        const skill = getSkill(this.characterSheet.skills, skillCategory as keyof CharacterSheet["skills"], skillName);
        skill.activated = true;
        skill.start = bonus;
        skill.current = bonus;
      } catch (error) {
        throw logAndEnsureHttpError(error);
      }
    };
    setupSkill(generalInformation.profession.skill, PROFESSION_SKILL_BONUS, "profession");
    setupSkill(generalInformation.hobby.skill, HOBBY_SKILL_BONUS, "hobby");

    console.log("Set general information");
    this.characterSheet.generalInformation = { ...generalInformation };
    this.generalInfoSet = true;
    return this;
  }

  activateSkills(activatableSkills: PostCharactersRequest["activatableSkillsForFree"]): this {
    console.log("Activate skills for free");

    for (const skill of activatableSkills) {
      try {
        const [category, name] = skill.split("/");
        const characterSkill = getSkill(this.characterSheet.skills, category as keyof CharacterSheet["skills"], name);
        if (characterSkill.activated) {
          throw new HttpError(400, `Skill '${skill}' is already activated.`);
        }
        characterSkill.activated = true;
      } catch (error) {
        throw logAndEnsureHttpError(error);
      }
    }
    this.skillsActivated = true;
    return this;
  }

  setUserId(userId: string): this {
    console.log(`Set userId: ${userId}`);
    this.userId = userId;
    return this;
  }

  build(): Character {
    if (!this.attributesSet || !this.generalInfoSet || !this.skillsActivated || !this.userId) {
      throw new HttpError(400, "All steps must be completed before building the character.");
    }
    return {
      characterId: uuidv4(),
      userId: this.userId,
      characterSheet: this.characterSheet,
    };
  }
}
