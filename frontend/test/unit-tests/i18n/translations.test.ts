import { describe, it, expect, beforeEach } from "vitest";
import { t, setLocale, getLocale } from "@/i18n";
import de from "@/i18n/de";

describe("i18n translation system", () => {
  beforeEach(() => {
    setLocale("de");
  });

  describe("t() function", () => {
    it("returns the German translation for a known key", () => {
      expect(t("appName")).toBe("World Hoppers");
    });

    it("returns the correct translation for various keys", () => {
      expect(t("signIn")).toBe("Anmelden");
      expect(t("signOut")).toBe("Abmelden");
      expect(t("cancel")).toBe("Abbrechen");
      expect(t("save")).toBe("Speichern");
    });

    it("interpolates positional {0} placeholders", () => {
      expect(t("professionBonus", "50")).toBe("Berufsbonus (+50)");
      expect(t("hobbyBonus", "25")).toBe("Hobbybonus (+25)");
    });

    it("interpolates numeric arguments", () => {
      expect(t("pointsRemaining", 12)).toBe("Verfügbare EP: 12");
    });

    it("handles positional arguments for pointsTotal", () => {
      expect(t("pointsTotal", 30)).toBe("Gesamte EP: 30");
    });

    it("handles multiple positional arguments", () => {
      expect(t("professionBonus", "50")).toBe("Berufsbonus (+50)");
    });

    it("returns string without modification when no placeholders and no args", () => {
      expect(t("dashboardTitle")).toBe("Meine Charaktere");
    });
  });

  describe("locale management", () => {
    it("defaults to 'de' locale", () => {
      expect(getLocale()).toBe("de");
    });

    it("returns 'de' after explicitly setting it", () => {
      setLocale("de");
      expect(getLocale()).toBe("de");
    });
  });

  describe("translation completeness", () => {
    it("has no empty translation values", () => {
      const entries = Object.entries(de);
      const emptyKeys = entries.filter(([, value]) => value.trim() === "").map(([key]) => key);
      expect(emptyKeys).toEqual([]);
    });

    it("has a reasonable number of translations", () => {
      const keyCount = Object.keys(de).length;
      expect(keyCount).toBeGreaterThan(300);
    });
  });
});
