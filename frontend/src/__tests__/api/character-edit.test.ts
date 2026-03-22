import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  updateAttribute,
  updateBaseValue,
  updateSkill,
  getSkillIncreaseCost,
  updateCombatStats,
  updateCalculationPoints,
  addSpecialAbility,
} from "@/api/character-edit";
import * as client from "@/api/client";

vi.mock("@/api/client", () => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  setTokenGetter: vi.fn(),
  ApiError: class ApiError extends Error {},
}));

describe("character-edit API", () => {
  beforeEach(() => {
    vi.mocked(client.get).mockReset();
    vi.mocked(client.post).mockReset();
    vi.mocked(client.patch).mockReset();
  });

  describe("updateAttribute", () => {
    it("calls PATCH with correct path", async () => {
      vi.mocked(client.patch).mockResolvedValue({});
      const data = { current: { initialValue: 5, increasedPoints: 1 } };
      await updateAttribute("char-1", "courage", data);
      expect(client.patch).toHaveBeenCalledWith("/characters/char-1/attributes/courage", expect.any(Object), data);
    });
  });

  describe("updateBaseValue", () => {
    it("calls PATCH with correct path", async () => {
      vi.mocked(client.patch).mockResolvedValue({});
      const data = { mod: { initialValue: 0, newValue: 2 } };
      await updateBaseValue("char-1", "healthPoints", data);
      expect(client.patch).toHaveBeenCalledWith(
        "/characters/char-1/base-values/healthPoints",
        expect.any(Object),
        data,
      );
    });
  });

  describe("updateSkill", () => {
    it("calls PATCH with category and name in path", async () => {
      vi.mocked(client.patch).mockResolvedValue({});
      const data = { current: { initialValue: 10, increasedPoints: 5 }, learningMethod: "NORMAL" as const };
      await updateSkill("char-1", "body", "athletics", data);
      expect(client.patch).toHaveBeenCalledWith("/characters/char-1/skills/body/athletics", expect.any(Object), data);
    });
  });

  describe("getSkillIncreaseCost", () => {
    it("calls GET with learning-method query parameter", async () => {
      vi.mocked(client.get).mockResolvedValue({ increaseCost: 10 });
      await getSkillIncreaseCost("char-1", "body", "athletics", "NORMAL");
      expect(client.get).toHaveBeenCalledWith(
        "/characters/char-1/skills/body/athletics?learning-method=NORMAL",
        expect.any(Object),
      );
    });

    it("uses correct learning method in URL", async () => {
      vi.mocked(client.get).mockResolvedValue({ increaseCost: 5 });
      await getSkillIncreaseCost("char-1", "combat", "daggers", "LOW_PRICED");
      expect(client.get).toHaveBeenCalledWith(
        "/characters/char-1/skills/combat/daggers?learning-method=LOW_PRICED",
        expect.any(Object),
      );
    });
  });

  describe("updateCombatStats", () => {
    it("calls PATCH with combat category and skill in path", async () => {
      vi.mocked(client.patch).mockResolvedValue({});
      const data = {
        skilledAttackValue: { initialValue: 5, increasedPoints: 2 },
        skilledParadeValue: { initialValue: 4, increasedPoints: 1 },
      };
      await updateCombatStats("char-1", "melee", "daggers", data);
      expect(client.patch).toHaveBeenCalledWith("/characters/char-1/combat/melee/daggers", expect.any(Object), data);
    });
  });

  describe("updateCalculationPoints", () => {
    it("calls PATCH with correct path", async () => {
      vi.mocked(client.patch).mockResolvedValue({});
      const data = { adventurePoints: { total: { initialValue: 100, increasedPoints: 50 } } };
      await updateCalculationPoints("char-1", data);
      expect(client.patch).toHaveBeenCalledWith("/characters/char-1/calculation-points", expect.any(Object), data);
    });
  });

  describe("addSpecialAbility", () => {
    it("calls POST with special ability name in body", async () => {
      vi.mocked(client.post).mockResolvedValue({});
      await addSpecialAbility("char-1", "Weapon Focus");
      expect(client.post).toHaveBeenCalledWith("/characters/char-1/special-abilities", expect.any(Object), {
        specialAbility: "Weapon Focus",
      });
    });
  });
});
