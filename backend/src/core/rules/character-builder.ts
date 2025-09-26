import { v4 as uuidv4 } from "uuid";
import {
  Attribute,
  BaseValue,
  CharacterSheet,
  CombatStats,
  Skill,
  ATTRIBUTE_POINTS_FOR_CREATION,
  MIN_LEVEL,
  START_SKILLS,
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
  Advantages,
  Disadvantages,
  ADVANTAGES,
  DISADVANTAGES,
  MAX_GENERATION_POINTS_THROUGH_DISADVANTAGES,
  GENERATION_POINTS,
  CharacterCreation,
  ActivatedSkills,
  BaseValues,
  baseValuesSchema,
  DisadvantagesNames,
  AdvantagesNames,
  characterSheetSchema,
  SkillNameWithCategory,
  SkillName,
  SkillCategory,
  CombatSkillName,
  CombatSkillsStartValues,
  CombatSection,
} from "api-spec";
import {
  COST_CATEGORY_COMBAT_SKILLS,
  COST_CATEGORY_DEFAULT,
  MAX_COST_CATEGORY,
  getCombatSkillHandling,
} from "./constants.js";
import {
  advantagesEnumToString,
  disadvantagesEnumToString,
  getAttribute,
  getCombatCategory,
  getSkill,
  getSkillCategoryAndName,
} from "../character-utils.js";
import { HttpError, logAndEnsureHttpError } from "../errors.js";
import { calculateBaseValues } from "./base-value-formulas.js";
import { calculateCombatStats } from "./combat-stats.js";

export class CharacterBuilder {
  private attributesSet = false;
  private generalInfoSet = false;
  private advantagesAndDisadvantagesSet = false;
  private skillsActivated = false;
  private combatSkillsStartValuesSet = false;

  private characterSheet: CharacterSheet;
  private userId?: string;
  private generationPointsThroughDisadvantages: number = 0;
  private spentGenerationPoints: number = 0;
  private totalGenerationPoints: number = 0;
  private activatedSkills: ActivatedSkills = [];

  constructor() {
    this.characterSheet = {
      generalInformation: {
        name: "",
        level: MIN_LEVEL,
        levelUpProgress: { effectsByLevel: {}, flags: { rerollUnlocked: false } },
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
        healthPoints: this.zeroBaseValue("healthPoints"),
        mentalHealth: this.zeroBaseValue("mentalHealth"),
        armorLevel: this.zeroBaseValue("armorLevel"),
        naturalArmor: this.zeroBaseValue("naturalArmor"),
        initiativeBaseValue: this.zeroBaseValue("initiativeBaseValue"),
        attackBaseValue: this.zeroBaseValue("attackBaseValue"),
        paradeBaseValue: this.zeroBaseValue("paradeBaseValue"),
        rangedAttackBaseValue: this.zeroBaseValue("rangedAttackBaseValue"),
        luckPoints: this.zeroBaseValue("luckPoints"),
        bonusActionsPerCombatRound: this.zeroBaseValue("bonusActionsPerCombatRound"),
        legendaryActions: this.zeroBaseValue("legendaryActions"),
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
        combat: this.createSkillObjectsFromSkillNames(
          "combat",
          combatSkills.map((skill) => getSkillCategoryAndName(skill).name),
        ) as CharacterSheet["skills"]["combat"],
        body: this.createSkillObjectsFromSkillNames(
          "body",
          this.getBodySkillNames(),
        ) as CharacterSheet["skills"]["body"],
        social: this.createSkillObjectsFromSkillNames(
          "social",
          this.getSocialSkillNames(),
        ) as CharacterSheet["skills"]["social"],
        nature: this.createSkillObjectsFromSkillNames(
          "nature",
          this.getNatureSkillNames(),
        ) as CharacterSheet["skills"]["nature"],
        knowledge: this.createSkillObjectsFromSkillNames(
          "knowledge",
          this.getKnowledgeSkillNames(),
        ) as CharacterSheet["skills"]["knowledge"],
        handcraft: this.createSkillObjectsFromSkillNames(
          "handcraft",
          this.getHandcraftSkillNames(),
        ) as CharacterSheet["skills"]["handcraft"],
      },
      combat: {
        melee: {
          martialArts: this.zeroCombatStats("martialArts"),
          barehanded: this.zeroCombatStats("barehanded"),
          chainWeapons: this.zeroCombatStats("chainWeapons"),
          daggers: this.zeroCombatStats("daggers"),
          slashingWeaponsSharp1h: this.zeroCombatStats("slashingWeaponsSharp1h"),
          slashingWeaponsBlunt1h: this.zeroCombatStats("slashingWeaponsBlunt1h"),
          thrustingWeapons1h: this.zeroCombatStats("thrustingWeapons1h"),
          slashingWeaponsSharp2h: this.zeroCombatStats("slashingWeaponsSharp2h"),
          slashingWeaponsBlunt2h: this.zeroCombatStats("slashingWeaponsBlunt2h"),
          thrustingWeapons2h: this.zeroCombatStats("thrustingWeapons2h"),
        },
        ranged: {
          missile: this.zeroCombatStats("missile"),
          firearmSimple: this.zeroCombatStats("firearmSimple"),
          firearmMedium: this.zeroCombatStats("firearmMedium"),
          firearmComplex: this.zeroCombatStats("firearmComplex"),
          heavyWeapons: this.zeroCombatStats("heavyWeapons"),
        },
      },
    };
  }

  private zeroAttribute(): Attribute {
    return { start: 0, current: 0, mod: 0, totalCost: 0 };
  }

  private zeroBaseValue(baseValueName: keyof BaseValues): BaseValue {
    return {
      // The values are updated again later when 'byFormula' is set
      start: 0,
      current: 0,
      mod: 0,
      // byLvlUp will be managed by the level-up endpoint; default undefined
    };
  }

  private setBaseValuesByFormula(): void {
    console.log("Set byFormula values for base values");

    const calculatedBaseValues = calculateBaseValues(this.characterSheet.attributes);

    for (const baseValueName of Object.keys(baseValuesSchema.shape) as (keyof BaseValues)[]) {
      if (!calculatedBaseValues[baseValueName]) {
        continue;
      }

      this.characterSheet.baseValues[baseValueName].start += calculatedBaseValues[baseValueName];
      this.characterSheet.baseValues[baseValueName].current += calculatedBaseValues[baseValueName];
      this.characterSheet.baseValues[baseValueName].byFormula = calculatedBaseValues[baseValueName];
    }
  }

  private zeroSkill(skill: SkillNameWithCategory): Skill {
    return {
      activated: START_SKILLS.includes(skill),
      start: 0,
      current: 0,
      mod: 0,
      totalCost: 0,
      defaultCostCategory: combatSkills.includes(skill) ? COST_CATEGORY_COMBAT_SKILLS : COST_CATEGORY_DEFAULT,
    };
  }

  private zeroCombatStats(name: CombatSkillName): CombatStats {
    return {
      availablePoints: getCombatSkillHandling(name),
      handling: getCombatSkillHandling(name),
      attackValue: 0,
      skilledAttackValue: 0,
      paradeValue: 0,
      skilledParadeValue: 0,
    };
  }

  private setCombatStats(): void {
    console.log("Set combat stats for combat skills");

    for (const combatSkillName of Object.keys(this.characterSheet.skills.combat) as CombatSkillName[]) {
      const combatCategory = getCombatCategory(combatSkillName);

      (this.characterSheet.combat[combatCategory] as Record<string, CombatStats>)[combatSkillName] =
        calculateCombatStats(
          combatSkillName,
          this.zeroSkill(`combat/${combatSkillName}` as SkillNameWithCategory), // Old skill not existing in character creation
          this.characterSheet.skills.combat[combatSkillName as CombatSkillName],
          this.characterSheet.baseValues,
          this.characterSheet.combat[combatCategory][
            combatSkillName as keyof CombatSection[typeof combatCategory]
          ] as CombatStats,
        );
    }
  }

  private createSkillObjectsFromSkillNames(skillCategory: SkillCategory, skillNames: SkillName[]) {
    return Object.fromEntries(
      skillNames.map((skillName) => {
        return [skillName, this.zeroSkill(`${skillCategory}/${skillName}` as SkillNameWithCategory)];
      }),
    );
  }

  private getBodySkillNames(): BodySkillName[] {
    return Object.keys(characterSheetSchema.shape.skills.shape.body.shape) as BodySkillName[];
  }

  private getSocialSkillNames(): SocialSkillName[] {
    return Object.keys(characterSheetSchema.shape.skills.shape.social.shape) as SocialSkillName[];
  }

  private getNatureSkillNames(): NatureSkillName[] {
    return Object.keys(characterSheetSchema.shape.skills.shape.nature.shape) as NatureSkillName[];
  }

  private getKnowledgeSkillNames(): KnowledgeSkillName[] {
    return Object.keys(characterSheetSchema.shape.skills.shape.knowledge.shape) as KnowledgeSkillName[];
  }

  private getHandcraftSkillNames(): HandcraftSkillName[] {
    return Object.keys(characterSheetSchema.shape.skills.shape.handcraft.shape) as HandcraftSkillName[];
  }

  private setAdvantages(advantages: Advantages): void {
    console.log(
      `Set advantages ${advantages.map(([name, info, value]) => `[${advantagesEnumToString(name)}, ${info}, ${value}]`).join(", ")}`,
    );

    for (const advantage of advantages) {
      const [name, , value] = advantage;
      const isInvalid = !ADVANTAGES.some(([advName, , advValue]) => advName === name && advValue === value);
      if (isInvalid) {
        throw new HttpError(400, `Invalid advantage: [${name}, ${value}]`);
      }
    }

    this.characterSheet.advantages = advantages;

    this.setAdvantagesEffects(advantages);

    this.spentGenerationPoints = advantages.reduce((sum, [, , value]) => sum + value, 0);
    console.log("Generation points spent on advantages:", this.spentGenerationPoints);
  }

  private setAdvantagesEffects(advantages: Advantages): void {
    console.log("Apply effects of advantages on character stats");

    for (const advantage of advantages) {
      const [enumValue, info] = advantage;
      const name = advantagesEnumToString(enumValue);
      console.log("Apply effect of advantage:", name);
      switch (enumValue) {
        case AdvantagesNames.HIGH_SCHOOL_DEGREE:
          this.characterSheet.skills.knowledge.anatomy.activated = true;
          this.characterSheet.skills.knowledge.anatomy.mod += 10;
          this.characterSheet.skills.knowledge.chemistry.activated = true;
          this.characterSheet.skills.knowledge.chemistry.mod += 10;
          this.characterSheet.skills.knowledge.geography.activated = true;
          this.characterSheet.skills.knowledge.geography.mod += 10;
          this.characterSheet.skills.knowledge.history.activated = true;
          this.characterSheet.skills.knowledge.history.mod += 10;
          this.characterSheet.skills.knowledge.botany.activated = true;
          this.characterSheet.skills.knowledge.botany.mod += 10;
          break;
        case AdvantagesNames.CHARMER:
          this.characterSheet.skills.social.seduction.mod += 10;
          this.characterSheet.skills.social.etiquette.mod += 10;
          this.characterSheet.skills.social.persuading.mod += 10;
          this.characterSheet.skills.social.convincing.mod += 10;
          this.characterSheet.attributes.charisma.mod += 1;
          break;
        case AdvantagesNames.GOOD_LOOKING:
          this.characterSheet.skills.social.seduction.mod += 20;
          this.characterSheet.skills.social.persuading.mod += 10;
          this.characterSheet.skills.social.convincing.mod += 10;
          break;
        case AdvantagesNames.GOOD_MEMORY:
          for (const skillName of Object.keys(this.characterSheet.skills.knowledge) as KnowledgeSkillName[]) {
            this.characterSheet.skills.knowledge[skillName].mod += 10;
          }
          this.characterSheet.attributes.intelligence.mod += 1;
          break;
        case AdvantagesNames.OUTSTANDING_SENSE_SIGHT_HEARING:
          this.characterSheet.skills.body.sharpnessOfSenses.mod += 10;
          break;
        case AdvantagesNames.MILITARY_TRAINING:
          this.characterSheet.skills.body.athletics.mod += 10;
          this.characterSheet.skills.body.bodyControl.mod += 10;
          this.characterSheet.skills.body.selfControl.mod += 10;
          this.characterSheet.skills.knowledge.warfare.mod += 10;
          break;
        case AdvantagesNames.DARING:
          this.characterSheet.attributes.courage.mod += 1;
          break;
        case AdvantagesNames.ATHLETIC:
          this.characterSheet.skills.body.athletics.mod += 10;
          this.characterSheet.skills.body.climbing.mod += 10;
          this.characterSheet.skills.body.bodyControl.mod += 10;
          this.characterSheet.skills.body.swimming.mod += 10;
          this.characterSheet.skills.body.dancing.mod += 10;
          break;
        case AdvantagesNames.COLLEGE_EDUCATION: {
          // Same effect as HIGH_SCHOOL_DEGREE
          this.characterSheet.skills.knowledge.anatomy.activated = true;
          this.characterSheet.skills.knowledge.anatomy.mod += 10;
          this.characterSheet.skills.knowledge.chemistry.activated = true;
          this.characterSheet.skills.knowledge.chemistry.mod += 10;
          this.characterSheet.skills.knowledge.geography.activated = true;
          this.characterSheet.skills.knowledge.geography.mod += 10;
          this.characterSheet.skills.knowledge.history.activated = true;
          this.characterSheet.skills.knowledge.history.mod += 10;
          this.characterSheet.skills.knowledge.botany.activated = true;
          this.characterSheet.skills.knowledge.botany.mod += 10;

          // Additional effect
          const knowledgeSkillName: KnowledgeSkillName = info as KnowledgeSkillName;
          if (!(knowledgeSkillName in this.characterSheet.skills.knowledge)) {
            throw new HttpError(400, `Invalid skill name: ${knowledgeSkillName}. It must be a valid knowledge skill.`);
          }

          const forbiddenSkills: KnowledgeSkillName[] = ["warfare", "estimating"];
          if (forbiddenSkills.includes(knowledgeSkillName)) {
            throw new HttpError(
              400,
              `Skills ${forbiddenSkills.join(", ")} cannot be selected as a bonus for advantage 'COLLEGE_EDUCATION'. Passed skill name: ${knowledgeSkillName}`,
            );
          }

          this.characterSheet.skills.knowledge[knowledgeSkillName].mod += 20;
          break;
        }
        case AdvantagesNames.MELODIOUS_VOICE:
          this.characterSheet.skills.social.persuading.mod += 10;
          this.characterSheet.skills.social.convincing.mod += 10;
          this.characterSheet.skills.social.bargaining.mod += 10;
          break;
        default:
          console.log("No direct effect on character stats for advantage:", name);
          break;
      }
    }
  }

  private setDisadvantages(disadvantages: Disadvantages): void {
    console.log(
      `Set disadvantages ${disadvantages.map(([name, info, value]) => `[${disadvantagesEnumToString(name)}, ${info}, ${value}]`).join(", ")}`,
    );

    for (const disadvantage of disadvantages) {
      const [name, , value] = disadvantage;
      const isInvalid = !DISADVANTAGES.some(
        ([disadvName, , disadvValue]) => disadvName === name && disadvValue === value,
      );
      if (isInvalid) {
        throw new HttpError(400, `Invalid disadvantage: [${name}, ${value}]`);
      }
    }

    this.generationPointsThroughDisadvantages = disadvantages.reduce((sum, [, , value]) => sum + value, 0);
    console.log("Generation points through disadvantages:", this.generationPointsThroughDisadvantages);
    if (this.generationPointsThroughDisadvantages > MAX_GENERATION_POINTS_THROUGH_DISADVANTAGES) {
      throw new HttpError(
        400,
        `Generation points through disadvantages exceed maximum allowed: ${MAX_GENERATION_POINTS_THROUGH_DISADVANTAGES}`,
      );
    }

    this.characterSheet.disadvantages = disadvantages;

    this.setDisadvantagesEffects(disadvantages);
  }

  private setDisadvantagesEffects(disadvantages: Disadvantages): void {
    console.log("Apply effects of disadvantages on character stats");

    for (const disadvantage of disadvantages) {
      const [enumValue, ,] = disadvantage;
      const name = disadvantagesEnumToString(enumValue);
      console.log("Apply effect of disadvantage:", name);
      switch (enumValue) {
        case DisadvantagesNames.SOCIALLY_INEPT:
          this.characterSheet.skills.social.seduction.mod -= 10;
          this.characterSheet.skills.social.etiquette.mod -= 10;
          this.characterSheet.skills.social.knowledgeOfHumanNature.mod -= 10;
          this.characterSheet.skills.social.convincing.mod -= 10;
          this.characterSheet.skills.social.persuading.mod -= 10;
          this.characterSheet.skills.social.bargaining.mod -= 10;
          break;
        case DisadvantagesNames.NO_DEGREE:
          this.characterSheet.skills.knowledge.anatomy.mod -= 10;
          this.characterSheet.skills.knowledge.chemistry.mod -= 10;
          this.characterSheet.skills.knowledge.geography.mod -= 10;
          this.characterSheet.skills.knowledge.history.mod -= 10;
          this.characterSheet.skills.knowledge.botany.mod -= 10;
          this.characterSheet.skills.knowledge.zoology.mod -= 10;
          this.characterSheet.skills.knowledge.mathematics.mod -= 10;
          break;
        case DisadvantagesNames.PACIFIST:
          this.characterSheet.skills.knowledge.warfare.mod -= 20;
          break;
        case DisadvantagesNames.EARLY_SCHOOL_DROPOUT:
          for (const skillName of Object.keys(this.characterSheet.skills.knowledge) as KnowledgeSkillName[]) {
            this.characterSheet.skills.knowledge[skillName].defaultCostCategory += 1;

            if (this.characterSheet.skills.knowledge[skillName].defaultCostCategory > MAX_COST_CATEGORY) {
              throw new HttpError(
                500,
                `Cost category for knowledge skill '${skillName}' exceeds maximum allowed: ${MAX_COST_CATEGORY}`,
              );
            }
          }
          break;
        default:
          console.log("No direct effect on character stats for disadvantage:", name);
          break;
      }
    }
  }

  setAttributes(attributes: AttributesForCreation): this {
    console.log("Set attributes");

    let spentAttributePoints = 0;
    for (const [attr, value] of Object.entries(attributes)) {
      const attribute = getAttribute(this.characterSheet.attributes, attr);
      attribute.start += value.current;
      attribute.current += value.current;
      attribute.totalCost += value.current;
      spentAttributePoints += attribute.totalCost;
    }
    if (spentAttributePoints !== ATTRIBUTE_POINTS_FOR_CREATION) {
      throw new HttpError(
        400,
        `Expected ${ATTRIBUTE_POINTS_FOR_CREATION} distributed attribute points, but got ${spentAttributePoints} points.`,
      );
    }

    this.setBaseValuesByFormula();

    this.attributesSet = true;

    return this;
  }

  setGeneralInformation(generalInformation: GeneralInformation): this {
    const setupSkill = (skillString: string, bonus: number, type: string) => {
      console.log(`Set ${type} with skill '${skillString}' and bonus ${bonus}`);

      try {
        const { category: skillCategory, name: skillName } = getSkillCategoryAndName(skillString);
        const skill = getSkill(this.characterSheet.skills, skillCategory, skillName);
        skill.activated = true;
        skill.mod += bonus;
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

  setAdvantagesAndDisadvantages(advantages: Advantages, disadvantages: Disadvantages): this {
    this.setDisadvantages(disadvantages);

    this.totalGenerationPoints = GENERATION_POINTS + this.generationPointsThroughDisadvantages;
    console.log("Available generation points:", this.totalGenerationPoints);

    this.setAdvantages(advantages);

    if (this.spentGenerationPoints > this.totalGenerationPoints) {
      throw new HttpError(
        400,
        `Generation points spent on advantages (${this.spentGenerationPoints}) exceed available generation points (${this.totalGenerationPoints}).`,
      );
    }

    this.advantagesAndDisadvantagesSet = true;

    return this;
  }

  activateSkills(activatedSkills: ActivatedSkills): this {
    console.log("Activate skills for free:", activatedSkills);

    for (const skill of activatedSkills) {
      try {
        const { category, name } = getSkillCategoryAndName(skill);
        const characterSkill = getSkill(this.characterSheet.skills, category, name);
        if (characterSkill.activated) {
          throw new HttpError(400, `Skill '${skill}' is already activated.`);
        }
        characterSkill.activated = true;
      } catch (error) {
        throw logAndEnsureHttpError(error);
      }
    }
    this.activatedSkills = activatedSkills;
    this.skillsActivated = true;
    return this;
  }

  setStartValuesOfCombatSkills(combatSkills: CombatSkillsStartValues): this {
    console.log("Set start values of combat skills");

    for (const [skillName, start] of Object.entries(combatSkills)) {
      this.characterSheet.skills.combat[skillName as CombatSkillName].start += start;
      this.characterSheet.skills.combat[skillName as CombatSkillName].current += start;
    }

    this.combatSkillsStartValuesSet = true;
    return this;
  }

  setUserId(userId: string): this {
    console.log(`Set userId: ${userId}`);
    this.userId = userId;
    return this;
  }

  build(): CharacterCreation {
    if (
      !this.attributesSet ||
      !this.generalInfoSet ||
      !this.advantagesAndDisadvantagesSet ||
      !this.skillsActivated ||
      !this.userId ||
      !this.combatSkillsStartValuesSet
    ) {
      throw new HttpError(400, "All steps must be completed before building the character.");
    }

    /**
     * Combat stats are affected by different previous steps as
     * attributes, profession/hobby, combat skills, etc.
     * Therefore, they are set last.
     */
    this.setCombatStats();

    return {
      character: {
        userId: this.userId,
        characterId: uuidv4(),
        characterSheet: characterSheetSchema.parse(this.characterSheet),
      },
      generationPoints: {
        throughDisadvantages: this.generationPointsThroughDisadvantages,
        spent: this.spentGenerationPoints,
        total: this.totalGenerationPoints,
      },
      activatedSkills: this.activatedSkills,
    };
  }
}
