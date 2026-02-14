import { GiJumpAcross } from "react-icons/gi";
import { GiDiscobolus } from "react-icons/gi";
import { GiMountainClimbing } from "react-icons/gi";
import { GiNunFace } from "react-icons/gi";
import { GiBodyBalance } from "react-icons/gi";
import { GiHorseHead } from "react-icons/gi";
import { GiSwimfins } from "react-icons/gi";
import { GiHoodedFigure } from "react-icons/gi";
import { GiHoodedAssassin } from "react-icons/gi";
import { GiSing } from "react-icons/gi";
import { GiScreaming } from "react-icons/gi";
import { GiAwareness } from "react-icons/gi";
import { GiSpikedHalo } from "react-icons/gi";
import { GiBeerStein } from "react-icons/gi";
import { GiHand } from "react-icons/gi";
import { GiRoundTable } from "react-icons/gi";
import { GiWrappedHeart } from "react-icons/gi";
import { GiInspiration } from "react-icons/gi";
import { GiChemicalDrop } from "react-icons/gi";
import { GiAxeSword } from "react-icons/gi";
import { GiBackup } from "react-icons/gi";
import { GiPencilBrush } from "react-icons/gi";
import { GiPencil } from "react-icons/gi";
import { GiCarnivalMask } from "react-icons/gi";
import { GiFallingStar } from "react-icons/gi";
import { GiDominoMask } from "react-icons/gi";
import { GiCalculator } from "react-icons/gi";
import { GiTeacher } from "react-icons/gi";
import { GiCoinflip } from "react-icons/gi";
import { GiBowString } from "react-icons/gi";
import { GiComputing } from "react-icons/gi";
import { GiBeerHorn } from "react-icons/gi";
import { GiMonkeyWrench } from "react-icons/gi";
import { Gi3dHammer } from "react-icons/gi";
import { GiField } from "react-icons/gi";
import { GiAnatomy } from "react-icons/gi";
import { GiBearHead } from "react-icons/gi";
import { GiRaceCar } from "react-icons/gi";
import { GiTalk } from "react-icons/gi";
import { GiTakeMyMoney } from "react-icons/gi";
import { GiCampfire } from "react-icons/gi";
import { GiFishing } from "react-icons/gi";
import { GiPathDistance } from "react-icons/gi";
import { GiDeerTrack } from "react-icons/gi";
import { GiRopeCoil } from "react-icons/gi";
import { GiCardExchange } from "react-icons/gi";
import { GiMechanicalArm } from "react-icons/gi";
import { GiMeatCleaver } from "react-icons/gi";
import { GiAnimalHide } from "react-icons/gi";
import { GiFirstAidKit } from "react-icons/gi";
import { GiWoodAxe } from "react-icons/gi";
import { GiCookingPot } from "react-icons/gi";
import { GiSewingString } from "react-icons/gi";
import { GiMusicalScore } from "react-icons/gi";
import { GiCombinationLock } from "react-icons/gi";
import { GiBookmark } from "react-icons/gi";
import { GiInjustice } from "react-icons/gi";
import { GiTreasureMap } from "react-icons/gi";
import { GiBrickWall } from "react-icons/gi";
import { GiStonePile } from "react-icons/gi";
import { GiPlantSeed } from "react-icons/gi";
import { GiHumanPyramid } from "react-icons/gi";
import { GiInternalOrgan } from "react-icons/gi";
import { GiMantrap } from "react-icons/gi";
import { GiGooeySword } from "react-icons/gi";
import { GiGraduateCap } from "react-icons/gi";
import { GiHistogram } from "react-icons/gi";
import { GiBestialFangs } from "react-icons/gi";
import { GiTinker } from "react-icons/gi";
import { GiDespair } from "react-icons/gi";

import { LearningMethod, CostCategory } from "api-spec";
import type { Skill, Character, Attribute, BaseValue, CharacterSheet } from "api-spec";

export interface ISkillProps {
  name: string;
  category: string;
  current_level: number;
  mod: number;
  activated: boolean;
  learning_method: LearningMethod;
  defaultCostCategory: CostCategory;
  cost: number;
}

function mapSkillToISkillProps(name: string, category: string, skill: Skill): ISkillProps {
  return {
    name,
    category,
    current_level: skill.current,
    mod: skill.mod,
    activated: skill.activated,
    learning_method: LearningMethod.NORMAL,
    defaultCostCategory: skill.defaultCostCategory,
    cost: skill.totalCost,
  };
}

function mapAttributeToISkillProps(name: string, category: string, attribute: Attribute): ISkillProps {
  return {
    name,
    category,
    current_level: attribute.current,
    mod: attribute.mod,
    activated: true,
    learning_method: LearningMethod.NORMAL,
    defaultCostCategory: CostCategory.CAT_0,
    cost: 1,
  };
}

function mapBaseValueToISkillProps(name: string, category: string, baseValue: BaseValue): ISkillProps {
  return {
    name,
    category,
    current_level: baseValue.current,
    mod: baseValue.mod,
    activated: true,
    learning_method: LearningMethod.NORMAL,
    defaultCostCategory: CostCategory.CAT_0,
    cost: 1,
  };
}

// function mapCombatSkillToISkillProps(name: string, category: string, combatSkill: CombatValues): ISkillProps {
//   return {
//     name,
//     category,
//     current_level: combatSkill.handling,
//     mod: 0,
//     activated: true,
//     learning_method: LearningMethod.NORMAL,
//     defaultCostCategory: CostCategory.CAT_0,
//     cost: 0,
//   };
// }

function mapNodeToISkillProps(
  name: string,
  category: string,
  data: Skill | Attribute | BaseValue,
  type: string
): ISkillProps {
  switch (type) {
    case "Skill":
      return mapSkillToISkillProps(name, category, data as Skill);
    case "Attribute":
      return mapAttributeToISkillProps(name, category, data as Attribute);
    case "BaseValue":
      return mapBaseValueToISkillProps(name, category, data as BaseValue);
    default:
      throw new Error(`Unknown type: ${type}`);
  }
}

type NodeExtractor = {
  key: keyof CharacterSheet;
  type: "Skill" | "Attribute" | "BaseValue" | "CombatValue";
  category?: string;
};

export const nodeExtractors: NodeExtractor[] = [
  { key: "skills", type: "Skill" },
  { key: "attributes", type: "Attribute", category: "Attributes" },
  { key: "baseValues", type: "BaseValue", category: "BaseValues" },
  { key: "combat", type: "CombatValue" },
];

export function extract_properties_data(characterSheet: CharacterSheet | null): ISkillProps[] {
  if (!characterSheet) return [];

  const result: ISkillProps[] = [];

  for (const extractor of nodeExtractors) {
    const key = extractor.key;

    // Skip baseValues and combatValues completely
    if (key === "combat" || key === "baseValues") continue;

    const node = characterSheet[key];
    const category = extractor.category || key;

    if (!node) continue;

    if (key === "skills") {
      Object.entries(node).forEach(([subCategory, subNode]) => {
        Object.entries(subNode).forEach(([name, data]) => {
          if (extractor.type === "Skill") {
            result.push(mapNodeToISkillProps(name, subCategory, data, extractor.type));
          }
        });
      });
    } else if (key === "attributes") {
      Object.entries(node).forEach(([name, data]) => {
        if (extractor.type === "Attribute") {
          result.push(mapNodeToISkillProps(name, category, data, extractor.type));
        }
      });
    }
  }

  return result;
}

export function parseCharacterSheet(json: string): Character | null {
  try {
    const character: Character = JSON.parse(json);

    if (!character.characterId || !character.characterSheet) {
      throw new Error("Invalid JSON structure");
    }

    return character;
  } catch (error) {
    console.error("Error parsing CharacterSheet JSON:", error);
    return null;
  }
}

export function render_skill_icon(skill_name: string): JSX.Element {
  switch (skill_name) {
    // Body
    case "athletics":
      return <GiDiscobolus size={25} />;
    case "acrobatics":
      return <GiJumpAcross size={25} />;
    case "juggleries":
      return <GiNunFace size={25} />;
    case "climbing":
      return <GiMountainClimbing size={25} />;
    case "bodyControl":
      return <GiBodyBalance size={25} />;
    case "riding":
      return <GiHorseHead size={25} />;
    case "sneaking":
      return <GiHoodedFigure size={25} />;
    case "swimming":
      return <GiSwimfins size={25} />;
    case "selfControl":
      return <GiSpikedHalo size={25} />;
    case "hiding":
      return <GiHoodedAssassin size={25} />;
    case "singing":
      return <GiSing size={25} />;
    case "sharpnessOfSenses":
      return <GiAwareness size={25} />;
    case "imitatingVoices":
      return <GiScreaming size={25} />;
    case "dancing":
      return <GiHumanPyramid size={25} />;
    case "quaffing":
      return <GiBeerStein size={25} />;
    case "pickpocketing":
      return <GiHand size={25} />;

    // Social
    case "social":
      return <GiRoundTable size={25} />;
    case "seduction":
      return <GiWrappedHeart size={25} />;
    case "etiquette":
      return <GiGraduateCap size={25} />;
    case "teaching":
      return <GiTeacher size={25} />;
    case "acting":
      return <GiCarnivalMask size={25} />;
    case "writtenExpression":
      return <GiPencil size={25} />;
    case "disguise":
      return <GiDominoMask size={25} />;
    case "streetKnowledge":
      return <GiGooeySword size={25} />;
    case "knowledgeOfHumanNature":
      return <GiBackup size={25} />;
    case "persuading":
      return <GiTalk size={25} />;
    case "convincing":
      return <GiTakeMyMoney size={25} />;

    // Exploration
    case "tracking":
      return <GiDeerTrack size={25} />;
    case "knottingSkills":
      return <GiRopeCoil size={25} />;
    case "trapping":
      return <GiMantrap size={25} />;
    case "fishing":
      return <GiFishing size={25} />;
    case "orientation":
      return <GiPathDistance size={25} />;
    case "wildernessLife":
      return <GiCampfire size={25} />;
    case "anatomy":
      return <GiAnatomy size={25} />;

    // Knowledge
    case "architecture":
      return <GiBrickWall size={25} />;
    case "geography":
      return <GiTreasureMap size={25} />;
    case "history":
      return <GiInspiration size={25} />;
    case "petrology":
      return <GiStonePile size={25} />;
    case "botany":
      return <GiPlantSeed size={25} />;
    case "philosophy":
      return <GiInternalOrgan size={25} />;
    case "astronomy":
      return <GiFallingStar size={25} />;
    case "mathematics":
      return <GiCalculator size={25} />;
    case "knowledgeOfTheLaw":
      return <GiInjustice size={25} />;
    case "estimating":
      return <GiHistogram size={25} />;
    case "zoology":
      return <GiBestialFangs size={25} />;
    case "technology":
      return <GiTinker size={25} />;
    case "chemistry":
      return <GiChemicalDrop size={25} />;
    case "warfare":
      return <GiAxeSword size={25} />;
    case "itSkills":
      return <GiComputing size={25} />;
    case "mechanics":
      return <GiMonkeyWrench size={25} />;
    case "craftsmanship":
      return <Gi3dHammer size={25} />;

    // Profession / Hobby
    case "training":
      return <GiBearHead size={25} />;
    case "foodProcessing":
      return <GiField size={25} />;
    case "metalwork":
      return <GiBowString size={25} />;
    case "stonework":
      return <GiBrickWall size={25} />;
    case "alcoholProduction":
      return <GiBeerHorn size={25} />;
    case "steeringVehicles":
      return <GiRaceCar size={25} />;
    case "cheating":
      return <GiCardExchange size={25} />;
    case "fineMechanics":
      return <GiMechanicalArm size={25} />;
    case "butchery":
      return <GiMeatCleaver size={25} />;
    case "leatherProcessing":
      return <GiAnimalHide size={25} />;
    case "bargaining":
      return <GiCoinflip size={25} />;
    case "firstAid":
      return <GiFirstAidKit size={25} />;
    case "calmingSbDown":
      return <GiDespair size={25} />;
    case "woodwork":
      return <GiWoodAxe size={25} />;
    case "cooking":
      return <GiCookingPot size={25} />;
    case "fabricProcessing":
      return <GiSewingString size={25} />;
    case "drawingAndPainting":
      return <GiPencilBrush size={25} />;
    case "makingMusic":
      return <GiMusicalScore size={25} />;
    case "lockpicking":
      return <GiCombinationLock size={25} />;
    case "languagesAndScripts":
      return <GiBookmark size={25} />;

    default:
      return <div />;
  }
}
