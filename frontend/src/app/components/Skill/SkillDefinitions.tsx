import { GiJumpAcross } from "react-icons/gi";
import { GiKneeling } from "react-icons/gi";
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
import { GiCampCookingPot } from "react-icons/gi";
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



export enum CostCategory {
  FREE,
  LOW_PRICED,
  NORMAL,
  EXPENSIVE,
}

export interface ISkillProps {
  name: string;
  category: string;
  level: number;
  is_active: boolean;
  cost_category: CostCategory;
  cost: number;
  is_edited: boolean;
  edited_level: number;
}

export function render_skill_icon(skill_name: string): JSX.Element {
  switch (skill_name) {
    case "Athletik":                return <GiDiscobolus size={25}/>;
    case "Akrobatik":               return <GiJumpAcross size={25}/>;
    case "Gaukeleien":              return <GiNunFace size={25}/>;
    case "Klettern":                return <GiMountainClimbing size={25}/>;
    case "Körperbeherrschung":      return <GiBodyBalance size={25}/>;
    case "Reiten":                  return <GiHorseHead size={25}/>;
    case "Schleichen":              return <GiHoodedFigure size={25}/>
    case "Schwimmen":               return <GiSwimfins size={25}/>;
    case "Selbstbeherrschung":      return <GiSpikedHalo size={25}/>;
    case "Sich verstecken":         return <GiHoodedAssassin size={25}/>;
    case "Singen":                  return <GiSing size={25}/>;
    case "Sinnenschärfe":           return <GiAwareness size={25}/>;
    case "Stimmen Imitieren":       return <GiScreaming size={25}/>;
    case "Tanzen":                  return <GiHumanPyramid size={25}/>
    case "Zechen":                  return <GiBeerStein size={25}/>;
    case "Taschendiebstahl":        return <GiHand size={25}/>;
    case "Gesellschaft":            return <GiRoundTable size={25}/>;
    case "Betören":                 return <GiWrappedHeart size={25}/>;
    case "Etikette":                return <GiGraduateCap size={25}/>;
    case "Religion":                return <GiKneeling size={25}/>;
    case "Lehren":                  return <GiTeacher size={25}/>;
    case "Schauspielerei":          return <GiCarnivalMask size={25}/>;
    case "Schriftlicher Ausdruck":  return <GiPencil size={25}/>;
    case "Sich verkleiden":         return <GiDominoMask size={25}/>;
    case "Gassenwissen":            return <GiGooeySword size={25}/>;
    case "Menschenkenntnis":        return <GiBackup size={25}/>;
    case "Überreden":               return <GiTalk size={25} />;
    case "Überzeugen":              return <GiTakeMyMoney size={25} />;
    case "Fährtensuchen":           return <GiDeerTrack size={25} />;
    case "Fesseln / Entfesseln":    return <GiRopeCoil size={25} />;
    case "Fallen stellen":          return <GiMantrap size={25} />;
    case "Fischen / Angeln":        return <GiFishing  size={25}/>;
    case "Orientierung":            return <GiPathDistance size={25} />;
    case "Wildnisleben":            return <GiCampfire size={25} />;
    case "Anatomie":                return <GiAnatomy size={25}/>;
    case "Baukunst":                return <GiBrickWall size={25} />;
    case "Geographie":              return <GiTreasureMap size={25} />;
    case "Geschichtswissen":        return <GiInspiration size={25}/>;
    case "Gesteinskunde":           return <GiStonePile  size={25}/>;
    case "Pflanzenkunde":           return <GiPlantSeed size={25} />;
    case "Philosophie":             return <GiInternalOrgan size={25}/>;
    case "Sternkunde":              return <GiFallingStar size={25}/>;
    case "Rechnen":                 return <GiCalculator size={25}/>;
    case "Rechtskunde":             return <GiInjustice size={25} />;
    case "Schätzen":                return <GiHistogram size={25}/>;
    case "Tierkunde":               return <GiBestialFangs size={25}/>;
    case "Technik":                 return <GiTinker size={25}/>;
    case "Chemie":                  return <GiChemicalDrop size={25}/>;
    case "Kriegskunst":             return <GiAxeSword size={25}/>;
    case "IT Kenntnis":             return <GiComputing size={25}/>;
    case "Mechanik":                return <GiMonkeyWrench size={25}/>;
    case "Handwerk":                return <Gi3dHammer size={25}/>;
    case "Abrichten":               return <GiBearHead size={25}/>;
    case "Ackerbau":                return <GiField size={25}/>;
    case "Bogenbau":                return <GiBowString size={25}/>;
    case "Maurerarbeiten":          return <GiCampCookingPot size={25}/>;
    case "Alkoholherstellung":      return <GiBeerHorn size={25}/>;
    case "Fahrzeug lenken":         return <GiRaceCar size={25}/>;
    case "Falschspiel":             return <GiCardExchange size={25} />;
    case "Feinmechanik":            return <GiMechanicalArm size={25} />;
    case "Fleischer":               return <GiMeatCleaver size={25} />;
    case "Gerber / Kürschner":      return <GiAnimalHide size={25} />;    
    case "Handel / Feilschen":      return <GiCoinflip size={25}/>;
    case "Erste Hilfe":             return <GiFirstAidKit size={25} />;
    case "Beruhigen":               return <GiDespair size={25}/>;   
    case "Holzbearbeitung":         return <GiWoodAxe size={25} />;
    case "Kochen":                  return <GiCookingPot size={25} />;
    case "Lederarbeit / Nähen":     return <GiSewingString size={25} />;
    case "Malen / Zeichnen":        return <GiPencilBrush size={25}/>;
    case "Musizieren":              return <GiMusicalScore size={25} />;
    case "Schlösser knacken":       return <GiCombinationLock size={25} />;
    case "Sprachen & Schriften":    return <GiBookmark size={25} />;
    case "Deutsch":
    case "Englisch":
    case "Spanisch":
    case "Französisch":
    case "Latein":
    case "Russisch":
    case "Chinesisch":
    case "Japanisch":
    case "Arabisch":
    case "Lateinisch (Schrift)":
    case "Chinesisch (Schrift)":
    case "Japanisch (Schrift)":
    case "Kyrillisch (Schrift)":
    case "Arabisch (Schrift)":
      return <div />;
    default:
      return <div></div>;
  }
}
