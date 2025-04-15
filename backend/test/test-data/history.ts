import { CostCategory, HistoryBlock, RecordType } from "config/index.js";
import { fakeCharacterId } from "./character.js";

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
      calculationPointsChange: {
        adjustment: 0,
        old: 100,
        new: 100,
      },
      comment: "Character created",
      timestamp: new Date().toISOString(),
    },
    {
      type: RecordType.ATTRIBUTE_RAISED,
      name: "Strength",
      number: 2,
      id: "fc0a5a71-80ac-47bc-85c2-85fc4c9de99a",
      data: {
        old: {
          start: 0,
          current: 0,
          mod: 0,
          totalCost: 0,
        },
        new: {
          start: 0,
          current: 1,
          mod: 0,
          totalCost: 1,
        },
      },
      learningMethod: null,
      calculationPointsChange: {
        adjustment: -1,
        old: 10,
        new: 9,
      },
      comment: "Weight training",
      timestamp: new Date().toISOString(),
    },
  ],
};

export const fakeHistoryBlock2: HistoryBlock = {
  characterId: fakeCharacterId,
  blockNumber: 2,
  blockId: "370f1082-3c9a-44ff-ad5c-cc6a28eba1fe",
  previousBlockId: "aa13a350-81e6-4c53-add6-3ed7c08db7c2",
  changes: [
    {
      type: RecordType.SKILL_RAISED,
      name: "Athletics",
      number: 3,
      id: "b51c5a79-2aa5-4649-916f-4d14ba47f702",
      data: {
        old: {
          activated: true,
          start: 0,
          current: 0,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_2,
        },
        new: {
          activated: true,
          start: 0,
          current: 10,
          mod: 0,
          totalCost: 10,
          defaultCostCategory: CostCategory.CAT_2,
        },
      },
      learningMethod: "NORMAL",
      calculationPointsChange: {
        adjustment: -10,
        old: 100,
        new: 90,
      },
      comment: null,
      timestamp: new Date().toISOString(),
    },
  ],
};
