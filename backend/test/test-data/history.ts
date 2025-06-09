import { v4 as uuidv4 } from "uuid";
import { CostCategory, HistoryBlock, RecordType, Record } from "config/index.js";
import { fakeCharacterId } from "./character.js";

export function addFakeHistoryRecord(
  block: HistoryBlock,
  record: Record,
  removePreviousRecords: boolean = false,
): void {
  if (removePreviousRecords) {
    record.number = block.changes[block.changes.length - 1].number;
    block.changes = [record];
  } else {
    record.number = block.changes[block.changes.length - 1].number + 1;
    block.changes.push(record);
  }
}

export const attributeAndBaseValueChangedRecord: Record = {
  type: RecordType.ATTRIBUTE_CHANGED,
  name: "strength",
  number: 2,
  id: "fc0a5a71-80ac-47bc-85c2-85fc4c9de99a",
  data: {
    old: {
      attribute: {
        start: 17,
        current: 18,
        mod: 1,
        totalCost: 15,
      },
      baseValues: {
        healthPoints: {
          start: 40,
          current: 100,
          byFormula: 77,
          byLvlUp: 23,
          mod: 10,
        },
        attackBaseValue: {
          start: 30,
          current: 110,
          byFormula: 110,
          mod: 0,
        },
        paradeBaseValue: {
          start: 30,
          current: 112,
          byFormula: 112,
          mod: 0,
        },
        rangedAttackBaseValue: {
          start: 25,
          current: 108,
          byFormula: 108,
          mod: 0,
        },
      },
    },
    new: {
      attribute: {
        start: 17,
        current: 20,
        mod: 1,
        totalCost: 17,
      },
      baseValues: {
        healthPoints: {
          start: 40,
          current: 102,
          byFormula: 79,
          byLvlUp: 23,
          mod: 10,
        },
        attackBaseValue: {
          start: 30,
          current: 114,
          byFormula: 114,
          mod: 0,
        },
        paradeBaseValue: {
          start: 30,
          current: 116,
          byFormula: 116,
          mod: 0,
        },
        rangedAttackBaseValue: {
          start: 25,
          current: 112,
          byFormula: 112,
          mod: 0,
        },
      },
    },
  },
  learningMethod: null,
  calculationPoints: {
    adventurePoints: null,
    attributePoints: {
      old: {
        start: 0,
        available: 10,
        total: 10,
      },
      new: {
        start: 0,
        available: 8,
        total: 10,
      },
    },
  },
  comment: "Weight training",
  timestamp: new Date().toISOString(),
};

export const attributeChangedRecord: Record = {
  type: RecordType.ATTRIBUTE_CHANGED,
  name: "intelligence",
  number: 2,
  id: "3d95138c-058e-445c-b366-ecdb3cb938ae",
  data: {
    old: {
      attribute: {
        start: 10,
        current: 12,
        mod: 2,
        totalCost: 15,
      },
    },
    new: {
      attribute: {
        start: 11,
        current: 13,
        mod: 3,
        totalCost: 16,
      },
    },
  },
  learningMethod: null,
  calculationPoints: {
    adventurePoints: null,
    attributePoints: {
      old: {
        start: 0,
        available: 10,
        total: 10,
      },
      new: {
        start: 0,
        available: 9,
        total: 10,
      },
    },
  },
  comment: null,
  timestamp: new Date().toISOString(),
};

export const skillChangedRecord: Record = {
  type: RecordType.SKILL_CHANGED,
  name: "body/athletics",
  number: 3,
  id: "f18003ae-a678-4273-b6be-e0f9bb6b023a",
  data: {
    old: {
      skill: {
        activated: true,
        start: 12,
        current: 16,
        mod: 4,
        totalCost: 40,
        defaultCostCategory: CostCategory.CAT_2,
      },
    },
    new: {
      skill: {
        activated: true,
        start: 14,
        current: 20,
        mod: 5,
        totalCost: 44,
        defaultCostCategory: CostCategory.CAT_2,
      },
    },
  },
  learningMethod: "NORMAL",
  calculationPoints: {
    adventurePoints: {
      old: {
        start: 0,
        available: 100,
        total: 200,
      },
      new: {
        start: 0,
        available: 96,
        total: 200,
      },
    },
    attributePoints: null,
  },
  comment: null,
  timestamp: new Date().toISOString(),
};

export const combatSkillChangedRecord: Record = {
  type: RecordType.SKILL_CHANGED,
  name: "combat/daggers (melee)",
  number: 3,
  id: "b51c5a79-2aa5-4649-916f-4d14ba47f702",
  data: {
    old: {
      skill: {
        activated: true,
        start: 10,
        current: 18,
        mod: 8,
        totalCost: 50,
        defaultCostCategory: CostCategory.CAT_3,
      },
      combatValues: {
        availablePoints: 26,
        attackValue: 10,
        paradeValue: 8,
      },
    },
    new: {
      skill: {
        activated: true,
        start: 11,
        current: 22,
        mod: 10,
        totalCost: 58,
        defaultCostCategory: CostCategory.CAT_3,
      },
      combatValues: {
        availablePoints: 33,
        attackValue: 10,
        paradeValue: 8,
      },
    },
  },
  learningMethod: "NORMAL",
  calculationPoints: {
    adventurePoints: {
      old: {
        start: 0,
        available: 100,
        total: 200,
      },
      new: {
        start: 0,
        available: 92,
        total: 200,
      },
    },
    attributePoints: null,
  },
  comment: null,
  timestamp: new Date().toISOString(),
};

export const combatValuesChangedRecord: Record = {
  type: RecordType.COMBAT_VALUES_CHANGED,
  name: "melee/thrustingWeapons1h",
  number: 3,
  id: "0f6b98a5-33c3-416e-bf1f-fde4ef49b166",
  data: {
    old: {
      availablePoints: 58,
      attackValue: 10,
      paradeValue: 8,
    },
    new: {
      availablePoints: 55,
      attackValue: 12,
      paradeValue: 9,
    },
  },
  learningMethod: null,
  calculationPoints: {
    adventurePoints: null,
    attributePoints: null,
  },
  comment: null,
  timestamp: new Date().toISOString(),
};

export const fakeHistoryBlock1: HistoryBlock = {
  characterId: fakeCharacterId,
  blockNumber: 1,
  blockId: "aa13a350-81e6-4c53-add6-3ed7c08db7c2",
  previousBlockId: null,
  changes: [
    {
      type: RecordType.EVENT_LEVEL_UP,
      name: "Lvl 1",
      number: 1,
      id: "5a17703e-c5fa-4fbb-bc6c-4d7f4ed50a67",
      data: {
        old: {
          value: 0,
        },
        new: {
          value: 1,
        },
      },
      learningMethod: null,
      calculationPoints: {
        adventurePoints: null,
        attributePoints: null,
      },
      comment: "Character created",
      timestamp: new Date().toISOString(),
    },
    attributeChangedRecord,
  ],
};

export const fakeHistoryBlock2: HistoryBlock = {
  characterId: fakeCharacterId,
  blockNumber: 2,
  blockId: "370f1082-3c9a-44ff-ad5c-cc6a28eba1fe",
  previousBlockId: "aa13a350-81e6-4c53-add6-3ed7c08db7c2",
  changes: [skillChangedRecord],
};

export const fakeBigHistoryBlock: HistoryBlock = {
  characterId: fakeCharacterId,
  blockNumber: 1,
  blockId: "8cdda4da-95d0-44f4-a8ab-8a36f539f946",
  previousBlockId: null,
  changes: generateLargeChangesList(500), // Enforce exceedance of maximum allowed size of a history block
};

function generateLargeChangesList(size: number): Record[] {
  const largeChanges = [];
  for (let i = 0; i < size; i++) {
    largeChanges.push({
      type: RecordType.SKILL_CHANGED,
      name: `category/skill${i}`,
      number: i + 1,
      id: uuidv4(),
      data: {
        old: {
          skill: {
            activated: true,
            start: 0,
            current: i,
            mod: 0,
            totalCost: i,
            defaultCostCategory: CostCategory.CAT_2,
          },
        },
        new: {
          skill: {
            activated: true,
            start: 0,
            current: i + 1,
            mod: 0,
            totalCost: i + 1,
            defaultCostCategory: CostCategory.CAT_2,
          },
        },
      },
      learningMethod: "NORMAL",
      calculationPoints: {
        adventurePoints: {
          old: {
            start: 0,
            available: 10000 - i,
            total: 10000,
          },
          new: {
            start: 0,
            available: 10000 - (i + 1),
            total: 10000,
          },
        },
        attributePoints: null,
      },
      comment: `Change ${i}`,
      timestamp: new Date().toISOString(),
    });
  }
  return largeChanges;
}
