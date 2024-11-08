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

function render_skill_icon(skill_name: string): JSX.Element {
  switch (skillName) {
    case "Körper":
    case "Athletik":
    case "Akrobatik":
    case "Gaukeleien":
    case "Klettern":
    case "Körperbeherrschung":
    case "Reiten":
    case "Schleichen":
    case "Schwimmen":
    case "Selbstbeherrschung":
    case "Sich verstecken":
    case "Singen":
    case "Sinnenschärfe":
    case "Stimmen Imitieren":
    case "Tanzen":
    case "Zechen":
    case "Taschendiebstahl":
    case "Gesellschaft":
    case "Betören":
    case "Etikette":
    case "Lehren":
    case "Schauspielerei":
    case "Schriftlicher Ausdruck":
    case "Sich verkleiden":
    case "Gassenwissen":
    case "Menschenkenntnis":
    case "Überreden":
    case "Überzeugen":
    case "Natur":
    case "Fährtensuchen":
    case "Fesseln / Entfesseln":
    case "Fallen stellen":
    case "Fischen / Angeln":
    case "Orientierung":
    case "Wildnisleben":
    case "Wissen":
    case "Anatomie":
    case "Baukunst":
    case "Geographie":
    case "Geschichtswissen":
    case "Gesteinskunde":
    case "Pflanzenkunde":
    case "Philosophie":
    case "Sternkunde":
    case "Rechnen":
    case "Rechtskunde":
    case "Schätzen":
    case "Tierkunde":
    case "Technik":
    case "Chemie":
    case "Kriegskunst":
    case "IT Kenntnis":
    case "Mechanik":
    case "Handwerk":
    case "Abrichten":
    case "Ackerbau":
    case "Bogenbau":
    case "Maurerarbeiten":
    case "Alkoholherstellung":
    case "Fahrzeug lenken":
    case "Falschspiel":
    case "Feinmechanik":
    case "Fleischer":
    case "Gerber / Kürschner":
    case "Handel / Feilschen":
    case "Erste Hilfe":
    case "Beruhigen":
    case "Holzbearbeitung":
    case "Kochen":
    case "Lederarbeit / Nähen":
    case "Malen / Zeichnen":
    case "Musizieren":
    case "Schlösser knacken":
    case "Sprachen & Schriften":
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
      return <div>Unknown skill</div>;
  }
}
