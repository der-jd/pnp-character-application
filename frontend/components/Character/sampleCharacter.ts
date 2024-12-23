import { Character, CostCategory } from "./character";

export const sample_char: Character = {
  characterId: "123e4567-e89b-12d3-a456-426614174000",
  characterSheet: {
    generalInformation: {
      name: "Aldred Stormblade",
      level: 5,
      sex: "Male",
      profession: {
        name: "Warrior",
        Skill: "Greatsword Mastery",
      },
      hobby: {
        name: "Woodcarving",
        Skill: "Precision Handcraft",
      },
      birthday: "2002-05-15",
      birthplace: "Stormhold",
      size: "6'2\"",
      weight: "210 lbs",
      hairColor: "Black",
      eyeColor: "Blue",
      residence: "Silverpine Fortress",
      appearance: "Tall and muscular, with a battle-scarred face",
      specialCharacteristics: "A tattoo of a dragon on his left arm",
    },
    calculationPoints: {
      adventurePoints: {
        available: 150,
        total: 300,
      },
      attributePoints: {
        start: 10,
        available: 5,
        total: 50,
      },
    },
    advantages: ["Quick Reflexes", "Iron Will", "Charismatic"],
    disadvantages: ["Short Temper", "Fear of Heights"],
    attributes: {
      courage: {
        start: 12,
        current: 15,
        mod: 3,
      },
      intelligence: {
        start: 10,
        current: 12,
        mod: 2,
      },
      concentration: {
        start: 11,
        current: 14,
        mod: 3,
      },
      charisma: {
        start: 11,
        current: 13,
        mod: 2,
      },
      mentalResilience: {
        start: 8,
        current: 10,
        mod: 2,
      },
      dexterity: {
        start: 14,
        current: 16,
        mod: 2,
      },
      endurance: {
        start: 17,
        current: 18,
        mod: 1,
      },
      strength: {
        start: 18,
        current: 20,
        mod: 2,
      },
    },
    baseValues: {
      healthPoints: {
        start: 120,
        current: 130,
        mod: 10,
      },
      mentalHealth: {
        start: 90,
        current: 85,
        mod: -5,
      },
      armorLevel: {
        start: 20,
        current: 30,
        mod: 10,
      },
      initiativeBaseValue: {
        start: 13,
        current: 15,
        mod: 2,
      },
      attackBaseValue: {
        start: 18,
        current: 22,
        mod: 4,
      },
      paradeBaseValue: {
        start: 15,
        current: 20,
        mod: 5,
      },
      rangedAttackBaseValue: {
        start: 12,
        current: 14,
        mod: 2,
      },
      luckPoints: {
        start: 3,
        current: 4,
        mod: 1,
      },
      bonusActionsPerCombatRound: {
        start: 1,
        current: 1,
        mod: 0,
      },
      legendaryActions: {
        start: 0,
        current: 0,
        mod: 0,
      },
    },
    skills: {
      combat: {
        greatsword: {
          activated: true,
          start: 10,
          current: 18,
          mod: 8,
          totalCost: 50,
          defaultCostCategory: CostCategory.CAT_0,
        },
        martialArt: {
          activated: false,
          start: 5,
          current: 12,
          mod: 7,
          totalCost: 30,
          defaultCostCategory: CostCategory.CAT_0,
        },
        firearmSimple: {
          activated: true,
          start: 6,
          current: 10,
          mod: 4,
          totalCost: 20,
          defaultCostCategory: CostCategory.CAT_0,
        },
        missile: {
          activated: false,
          start: 4,
          current: 8,
          mod: 4,
          totalCost: 15,
          defaultCostCategory: CostCategory.CAT_0,
        },
      },
      body: {
        athletics: {
          activated: true,
          start: 12,
          current: 16,
          mod: 4,
          totalCost: 40,
          defaultCostCategory: CostCategory.CAT_0,
        },
        swimming: {
          activated: true,
          start: 8,
          current: 12,
          mod: 4,
          totalCost: 25,
          defaultCostCategory: CostCategory.CAT_0,
        },
      },
      social: {
        acting: {
          activated: true,
          start: 7,
          current: 10,
          mod: 3,
          totalCost: 15,
          defaultCostCategory: CostCategory.CAT_0,
        },
        convincing: {
          activated: false,
          start: 8,
          current: 14,
          mod: 6,
          totalCost: 20,
          defaultCostCategory: CostCategory.CAT_0,
        },
      },
      nature: {
        fishing: {
          activated: false,
          start: 5,
          current: 8,
          mod: 3,
          totalCost: 10,
          defaultCostCategory: CostCategory.CAT_0,
        },
        orientation: {
          activated: true,
          start: 10,
          current: 13,
          mod: 3,
          totalCost: 20,
          defaultCostCategory: CostCategory.CAT_0,
        },
      },
      knowledge: {
        geography: {
          activated: true,
          start: 6,
          current: 10,
          mod: 4,
          totalCost: 15,
          defaultCostCategory: CostCategory.CAT_0,
        },
        history: {
          activated: true,
          start: 8,
          current: 12,
          mod: 4,
          totalCost: 20,
          defaultCostCategory: CostCategory.CAT_0,
        },
      },
      handcraft: {
        butcher: {
          activated: false,
          start: 3,
          current: 6,
          mod: 3,
          totalCost: 10,
          defaultCostCategory: CostCategory.CAT_0,
        },
        lockpicking: {
          activated: true,
          start: 9,
          current: 11,
          mod: 2,
          totalCost: 15,
          defaultCostCategory: CostCategory.CAT_0,
        },
      },
      combatSkills: {
        melee: {
          greatsword: {
            handling: 18,
            attackDistributed: 10,
            paradeDistributed: 8,
          },
          martialArt: {
            handling: 12,
            attackDistributed: 6,
            paradeDistributed: 6,
          },
        },
        ranged: {
          firearmSimple: {
            handling: 10,
            attackDistributed: 6,
            paradeDistributed: 4,
          },
          missile: {
            handling: 8,
            attackDistributed: 5,
            paradeDistributed: 3,
          },
        },
      },
    },
  },
};
