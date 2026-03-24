import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { Check } from "lucide-react";
import {
  ATTRIBUTE_POINTS_FOR_CREATION,
  MIN_ATTRIBUTE_VALUE_FOR_CREATION,
  MAX_ATTRIBUTE_VALUE_FOR_CREATION,
  GENERATION_POINTS,
  MAX_GENERATION_POINTS_THROUGH_DISADVANTAGES,
  NUMBER_OF_ACTIVATABLE_SKILLS_FOR_CREATION,
  MIN_INITIAL_COMBAT_SKILL_VALUE,
  MAX_INITIAL_COMBAT_SKILL_VALUE,
  PROFESSION_SKILL_BONUS,
  HOBBY_SKILL_BONUS,
  ADVANTAGES,
  DISADVANTAGES,
  START_SKILLS,
  MIN_LEVEL,
  combatSkills,
  AdvantagesNames,
  type PostCharactersRequest,
  type Advantages,
  type Disadvantages,
  type SkillNameWithCategory,
} from "api-spec";
import { t } from "@/i18n";
import { createCharacter } from "@/api/characters";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { skillNameKeys, skillCategoryKeys, advantageNameKeys, disadvantageNameKeys } from "@/i18n/mappings";

const STEPS = [
  "wizardStepGeneral",
  "wizardStepProfession",
  "wizardStepAdvantages",
  "wizardStepAttributes",
  "wizardStepSkills",
  "wizardStepCombat",
  "wizardStepReview",
] as const;

const ATTRIBUTE_NAMES = [
  "courage",
  "intelligence",
  "concentration",
  "charisma",
  "mentalResilience",
  "dexterity",
  "endurance",
  "strength",
] as const;

const COMBAT_SKILL_NAMES = [
  "martialArts",
  "barehanded",
  "chainWeapons",
  "daggers",
  "slashingWeaponsSharp1h",
  "slashingWeaponsBlunt1h",
  "thrustingWeapons1h",
  "slashingWeaponsSharp2h",
  "slashingWeaponsBlunt2h",
  "thrustingWeapons2h",
  "missile",
  "firearmSimple",
  "firearmMedium",
  "firearmComplex",
  "heavyWeapons",
] as const;

// All non-combat skills available in the game (manually constructed from schema)
const ALL_NON_COMBAT_SKILLS: SkillNameWithCategory[] = [
  // Body skills
  "body/athletics",
  "body/juggleries",
  "body/climbing",
  "body/bodyControl",
  "body/riding",
  "body/sneaking",
  "body/swimming",
  "body/selfControl",
  "body/hiding",
  "body/singing",
  "body/sharpnessOfSenses",
  "body/dancing",
  "body/quaffing",
  "body/pickpocketing",
  // Social skills
  "social/seduction",
  "social/etiquette",
  "social/teaching",
  "social/acting",
  "social/writtenExpression",
  "social/streetKnowledge",
  "social/knowledgeOfHumanNature",
  "social/persuading",
  "social/convincing",
  "social/bargaining",
  // Nature skills
  "nature/tracking",
  "nature/knottingSkills",
  "nature/trapping",
  "nature/fishing",
  "nature/orientation",
  "nature/wildernessLife",
  // Knowledge skills
  "knowledge/anatomy",
  "knowledge/architecture",
  "knowledge/geography",
  "knowledge/history",
  "knowledge/petrology",
  "knowledge/botany",
  "knowledge/philosophy",
  "knowledge/astronomy",
  "knowledge/mathematics",
  "knowledge/knowledgeOfTheLaw",
  "knowledge/estimating",
  "knowledge/zoology",
  "knowledge/technology",
  "knowledge/chemistry",
  "knowledge/warfare",
  "knowledge/itSkills",
  "knowledge/mechanics",
  // Handcraft skills
  "handcraft/training",
  "handcraft/woodwork",
  "handcraft/foodProcessing",
  "handcraft/leatherProcessing",
  "handcraft/metalwork",
  "handcraft/stonework",
  "handcraft/fabricProcessing",
  "handcraft/alcoholProduction",
  "handcraft/steeringVehicles",
  "handcraft/fineMechanics",
  "handcraft/cheating",
  "handcraft/firstAid",
  "handcraft/calmingSbDown",
  "handcraft/drawingAndPainting",
  "handcraft/makingMusic",
  "handcraft/lockpicking",
];

interface WizardState {
  // Step 1 - General
  name: string;
  sex: string;
  birthday: string;
  birthplace: string;
  size: string;
  weight: string;
  hairColor: string;
  eyeColor: string;
  residence: string;
  appearance: string;
  specialCharacteristics: string;
  // Step 2 - Profession & Hobby
  professionName: string;
  professionSkill: string;
  hobbyName: string;
  hobbySkill: string;
  // Step 3 - Advantages & Disadvantages
  selectedAdvantages: Advantages;
  selectedDisadvantages: Disadvantages;
  // Step 4 - Attributes
  attributes: Record<string, number>;
  // Step 5 - Activated Skills
  activatedSkills: SkillNameWithCategory[];
  // Step 6 - Combat Skills
  combatSkillValues: Record<string, number>;
}

function createInitialState(): WizardState {
  const attrs: Record<string, number> = {};
  for (const a of ATTRIBUTE_NAMES) attrs[a] = MIN_ATTRIBUTE_VALUE_FOR_CREATION;
  const combatVals: Record<string, number> = {};
  for (const c of COMBAT_SKILL_NAMES) combatVals[c] = MIN_INITIAL_COMBAT_SKILL_VALUE;
  return {
    name: "",
    sex: "",
    birthday: "",
    birthplace: "",
    size: "",
    weight: "",
    hairColor: "",
    eyeColor: "",
    residence: "",
    appearance: "",
    specialCharacteristics: "",
    professionName: "",
    professionSkill: "",
    hobbyName: "",
    hobbySkill: "",
    selectedAdvantages: [],
    selectedDisadvantages: [],
    attributes: attrs,
    activatedSkills: [],
    combatSkillValues: combatVals,
  };
}

export function CharacterCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(createInitialState);

  const mutation = useMutation({
    mutationFn: (data: PostCharactersRequest) => createCharacter(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["characters"] });
      toast("success", t("toastCharacterCreated"));
      navigate(`/characters/${result.data.characterId}`);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast("error", error.message);
      } else {
        toast("error", t("toastSaveError"));
      }
    },
  });

  function handleSubmit() {
    if (!state.name.trim()) {
      toast("error", t("wizardErrorNameRequired"));
      return;
    }
    if (!state.professionSkill) {
      toast("error", t("wizardErrorProfessionSkillRequired"));
      return;
    }
    if (!state.hobbySkill) {
      toast("error", t("wizardErrorHobbySkillRequired"));
      return;
    }

    const attributes = Object.fromEntries(ATTRIBUTE_NAMES.map((a) => [a, { current: state.attributes[a]! }]));
    const request: PostCharactersRequest = {
      generalInformation: {
        name: state.name,
        level: MIN_LEVEL,
        levelUpProgress: { effectsByLevel: {}, effects: {} },
        sex: state.sex,
        profession: { name: state.professionName, skill: state.professionSkill as SkillNameWithCategory },
        hobby: { name: state.hobbyName, skill: state.hobbySkill as SkillNameWithCategory },
        birthday: state.birthday,
        birthplace: state.birthplace,
        size: state.size,
        weight: state.weight,
        hairColor: state.hairColor,
        eyeColor: state.eyeColor,
        residence: state.residence,
        appearance: state.appearance,
        specialCharacteristics: state.specialCharacteristics,
      },
      attributes: attributes as PostCharactersRequest["attributes"],
      advantages: state.selectedAdvantages,
      disadvantages: state.selectedDisadvantages,
      activatedSkills: state.activatedSkills as PostCharactersRequest["activatedSkills"],
      combatSkillsStartValues: state.combatSkillValues as PostCharactersRequest["combatSkillsStartValues"],
    };
    mutation.mutate(request);
  }

  const update = useCallback((partial: Partial<WizardState>) => setState((prev) => ({ ...prev, ...partial })), []);
  const canGoBack = step > 0;
  const isLastStep = step === STEPS.length - 1;

  function canProceedFromStep(currentStep: number): boolean {
    switch (currentStep) {
      case 0:
        return state.name.trim().length > 0;
      case 1:
        return state.professionSkill.length > 0 && state.hobbySkill.length > 0;
      case 3: {
        const totalUsed = Object.values(state.attributes).reduce((s, v) => s + v, 0);
        return totalUsed === ATTRIBUTE_POINTS_FOR_CREATION;
      }
      case 4:
        return state.activatedSkills.length === NUMBER_OF_ACTIVATABLE_SKILLS_FOR_CREATION;
      default:
        return true;
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t("wizardTitle")}</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <button
            key={s}
            onClick={() => i < step && setStep(i)}
            className={clsx(
              "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer",
              i === step
                ? "bg-accent-primary text-white"
                : i < step
                  ? "bg-accent-success/10 text-accent-success"
                  : "bg-bg-tertiary text-text-muted",
            )}
          >
            {i < step ? <Check size={12} /> : <span>{i + 1}</span>}
            <span>{t(s)}</span>
          </button>
        ))}
      </div>

      {/* Step content */}
      <Card className="mb-6">
        {step === 0 && <StepGeneral state={state} update={update} />}
        {step === 1 && <StepProfession state={state} update={update} />}
        {step === 2 && <StepAdvantages state={state} update={update} />}
        {step === 3 && <StepAttributes state={state} update={update} />}
        {step === 4 && <StepSkills state={state} update={update} />}
        {step === 5 && <StepCombat state={state} update={update} />}
        {step === 6 && <StepReview state={state} />}
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="secondary" onClick={() => (canGoBack ? setStep(step - 1) : navigate("/dashboard"))}>
          {canGoBack ? t("back") : t("cancel")}
        </Button>
        {isLastStep ? (
          <Button onClick={handleSubmit} loading={mutation.isPending}>
            {t("submit")}
          </Button>
        ) : (
          <Button onClick={() => setStep(step + 1)} disabled={!canProceedFromStep(step)}>
            {t("next")}
          </Button>
        )}
      </div>
    </div>
  );
}

interface StepProps {
  state: WizardState;
  update: (partial: Partial<WizardState>) => void;
}

function StepGeneral({ state, update }: StepProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Input
        label={t("characterName")}
        value={state.name}
        onChange={(e) => update({ name: e.target.value })}
        required
        className="col-span-2"
      />
      <Input label={t("sex")} value={state.sex} onChange={(e) => update({ sex: e.target.value })} />
      <Input label={t("birthday")} value={state.birthday} onChange={(e) => update({ birthday: e.target.value })} />
      <Input
        label={t("birthplace")}
        value={state.birthplace}
        onChange={(e) => update({ birthplace: e.target.value })}
      />
      <Input label={t("size")} value={state.size} onChange={(e) => update({ size: e.target.value })} />
      <Input label={t("weight")} value={state.weight} onChange={(e) => update({ weight: e.target.value })} />
      <Input label={t("hairColor")} value={state.hairColor} onChange={(e) => update({ hairColor: e.target.value })} />
      <Input label={t("eyeColor")} value={state.eyeColor} onChange={(e) => update({ eyeColor: e.target.value })} />
      <Input
        label={t("residence")}
        value={state.residence}
        onChange={(e) => update({ residence: e.target.value })}
        className="col-span-2"
      />
      <div className="col-span-2">
        <label className="text-sm font-medium text-text-secondary block mb-1.5">{t("appearance")}</label>
        <textarea
          className="w-full rounded-md border border-border-primary bg-bg-secondary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-border-focus min-h-[80px]"
          value={state.appearance}
          onChange={(e) => update({ appearance: e.target.value })}
        />
      </div>
      <div className="col-span-2">
        <label className="text-sm font-medium text-text-secondary block mb-1.5">{t("specialCharacteristics")}</label>
        <textarea
          className="w-full rounded-md border border-border-primary bg-bg-secondary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-border-focus min-h-[80px]"
          value={state.specialCharacteristics}
          onChange={(e) => update({ specialCharacteristics: e.target.value })}
        />
      </div>
    </div>
  );
}

// Get all skills (combat and non-combat) for profession and hobby selection
function getAllSkills(): SkillNameWithCategory[] {
  return [...ALL_NON_COMBAT_SKILLS, ...combatSkills];
}

function StepProfession({ state, update }: StepProps) {
  const skillOptions = useMemo(() => {
    const allSkills = getAllSkills();
    return allSkills.map((s: SkillNameWithCategory) => {
      const [cat, name] = s.split("/") as [string, string];
      return { value: s, label: `${t(skillCategoryKeys[cat]!)} — ${t(skillNameKeys[name]!)}` };
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-3">
          {t("profession")} <Badge variant="info">{t("professionBonus", PROFESSION_SKILL_BONUS)}</Badge>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label={t("professionName")}
            value={state.professionName}
            onChange={(e) => update({ professionName: e.target.value })}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">{t("associatedSkill")}</label>
            <select
              className="w-full rounded-md border border-border-primary bg-bg-secondary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-border-focus"
              value={state.professionSkill}
              onChange={(e) => update({ professionSkill: e.target.value })}
            >
              <option value="">{t("select")}</option>
              {skillOptions.map((o: { value: string; label: string }) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-3">
          {t("hobby")} <Badge variant="info">{t("hobbyBonus", HOBBY_SKILL_BONUS)}</Badge>
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t("hobbyName")}
            value={state.hobbyName}
            onChange={(e) => update({ hobbyName: e.target.value })}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">{t("associatedSkill")}</label>
            <select
              className="w-full rounded-md border border-border-primary bg-bg-secondary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-border-focus"
              value={state.hobbySkill}
              onChange={(e) => update({ hobbySkill: e.target.value })}
            >
              <option value="">{t("select")}</option>
              {skillOptions.map((o: { value: string; label: string }) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepAdvantages({ state, update }: StepProps) {
  const disadvanageCost = state.selectedDisadvantages.reduce((sum, d) => sum + d[2], 0);
  const advantageCost = state.selectedAdvantages.reduce((sum, a) => sum + a[2], 0);
  const pointsFromDisadvantages = Math.min(disadvanageCost, MAX_GENERATION_POINTS_THROUGH_DISADVANTAGES);
  const totalPoints = GENERATION_POINTS + pointsFromDisadvantages;
  const remaining = totalPoints - advantageCost;

  return (
    <div className="space-y-6">
      {/* Points summary */}
      <div className="flex gap-4 flex-wrap">
        <Badge variant={remaining >= 0 ? "info" : "danger"}>
          {t("generationPointsAvailable")}: {remaining}
        </Badge>
        <Badge variant="default">
          {t("generationPointsFromDisadvantages")}: {pointsFromDisadvantages}/
          {MAX_GENERATION_POINTS_THROUGH_DISADVANTAGES}
        </Badge>
        <Badge variant="default">
          {t("generationPointsSpent")}: {advantageCost}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Advantages */}
        <div>
          <h3 className="text-sm font-semibold mb-3">{t("advantages")}</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
            {ADVANTAGES.map((adv, i) => {
              const isSelected = state.selectedAdvantages.some((sa) => sa[0] === adv[0] && sa[2] === adv[2]);
              return (
                <label
                  key={`adv-${i}`}
                  className={clsx(
                    "flex items-center justify-between rounded-lg border px-3 py-2 cursor-pointer transition-colors",
                    isSelected
                      ? "border-accent-primary bg-accent-primary/5"
                      : "border-border-primary hover:border-border-secondary",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        if (isSelected) {
                          update({
                            selectedAdvantages: state.selectedAdvantages.filter(
                              (sa) => !(sa[0] === adv[0] && sa[2] === adv[2]),
                            ),
                          });
                        } else {
                          update({
                            selectedAdvantages: [...state.selectedAdvantages, [...adv]],
                          });
                        }
                      }}
                      className="accent-accent-primary"
                    />
                    <span className="text-sm">{t(advantageNameKeys[adv[0]]!)}</span>
                  </div>
                  <Badge variant="warning">{adv[2]}</Badge>
                </label>
              );
            })}
          </div>
        </div>

        {/* Disadvantages */}
        <div>
          <h3 className="text-sm font-semibold mb-3">{t("disadvantages")}</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
            {DISADVANTAGES.map((dis, i) => {
              const isSelected = state.selectedDisadvantages.some((sd) => sd[0] === dis[0] && sd[2] === dis[2]);
              return (
                <label
                  key={`dis-${i}`}
                  className={clsx(
                    "flex items-center justify-between rounded-lg border px-3 py-2 cursor-pointer transition-colors",
                    isSelected
                      ? "border-accent-primary bg-accent-primary/5"
                      : "border-border-primary hover:border-border-secondary",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        if (isSelected) {
                          update({
                            selectedDisadvantages: state.selectedDisadvantages.filter(
                              (sd) => !(sd[0] === dis[0] && sd[2] === dis[2]),
                            ),
                          });
                        } else {
                          update({
                            selectedDisadvantages: [...state.selectedDisadvantages, [...dis]],
                          });
                        }
                      }}
                      className="accent-accent-primary"
                    />
                    <span className="text-sm">{t(disadvantageNameKeys[dis[0]]!)}</span>
                    {dis[1] && <span className="text-xs text-text-muted">({dis[1]})</span>}
                  </div>
                  <Badge variant="success">+{dis[2]}</Badge>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepAttributes({ state, update }: StepProps) {
  const totalUsed = Object.values(state.attributes).reduce((s, v) => s + v, 0);
  const remaining = ATTRIBUTE_POINTS_FOR_CREATION - totalUsed;

  function setAttr(name: string, value: number) {
    const clamped = Math.max(MIN_ATTRIBUTE_VALUE_FOR_CREATION, Math.min(MAX_ATTRIBUTE_VALUE_FOR_CREATION, value));
    update({ attributes: { ...state.attributes, [name]: clamped } });
  }

  return (
    <div>
      <div className="mb-4 flex gap-4">
        <Badge variant={remaining === 0 ? "success" : remaining > 0 ? "info" : "danger"}>
          {t("pointsRemaining", remaining)}
        </Badge>
        <Badge variant="default">{t("pointsTotal", totalUsed, ATTRIBUTE_POINTS_FOR_CREATION)}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ATTRIBUTE_NAMES.map((attr) => (
          <div
            key={attr}
            className="flex items-center justify-between rounded-lg border border-border-primary px-4 py-3"
          >
            <span className="text-sm font-medium">{t(attr as keyof typeof import("@/i18n/de").default)}</span>
            <div className="flex items-center gap-2">
              <button
                className="h-7 w-7 rounded border border-border-primary bg-bg-tertiary text-text-primary hover:bg-bg-hover flex items-center justify-center cursor-pointer"
                onClick={() => setAttr(attr, state.attributes[attr]! - 1)}
              >
                −
              </button>
              <span className="w-8 text-center font-mono text-lg font-bold">{state.attributes[attr]}</span>
              <button
                className="h-7 w-7 rounded border border-border-primary bg-bg-tertiary text-text-primary hover:bg-bg-hover flex items-center justify-center cursor-pointer"
                onClick={() => setAttr(attr, state.attributes[attr]! + 1)}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepSkills({ state, update }: StepProps) {
  const selected = state.activatedSkills;
  const count = selected.length;

  const alreadyActivatedSkills = new Set<SkillNameWithCategory>([
    ...START_SKILLS.filter((s) => !s.startsWith("combat/")),
  ]);

  if (state.professionSkill) {
    alreadyActivatedSkills.add(state.professionSkill as SkillNameWithCategory);
  }
  if (state.hobbySkill) {
    alreadyActivatedSkills.add(state.hobbySkill as SkillNameWithCategory);
  }

  for (const advantage of state.selectedAdvantages) {
    const [advantageType] = advantage;
    if (advantageType === AdvantagesNames.HIGH_SCHOOL_DEGREE || advantageType === AdvantagesNames.COLLEGE_EDUCATION) {
      alreadyActivatedSkills.add("knowledge/anatomy");
      alreadyActivatedSkills.add("knowledge/chemistry");
      alreadyActivatedSkills.add("knowledge/geography");
      alreadyActivatedSkills.add("knowledge/history");
      alreadyActivatedSkills.add("knowledge/botany");
    }
  }

  const availableSkills = ALL_NON_COMBAT_SKILLS.filter((skill) => !alreadyActivatedSkills.has(skill));

  function toggle(skill: SkillNameWithCategory) {
    if (selected.includes(skill)) {
      update({ activatedSkills: selected.filter((s) => s !== skill) });
    } else if (count < NUMBER_OF_ACTIVATABLE_SKILLS_FOR_CREATION) {
      update({ activatedSkills: [...selected, skill] });
    }
  }

  return (
    <div>
      <div className="mb-4">
        <Badge variant={count === NUMBER_OF_ACTIVATABLE_SKILLS_FOR_CREATION ? "success" : "info"}>
          {count}/{NUMBER_OF_ACTIVATABLE_SKILLS_FOR_CREATION} {t("activated")}
        </Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {availableSkills.map((skill) => {
          const [cat, name] = skill.split("/") as [string, string];
          const isSelected = selected.includes(skill);
          return (
            <label
              key={skill}
              className={clsx(
                "flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors text-sm",
                isSelected
                  ? "border-accent-primary bg-accent-primary/5"
                  : "border-border-primary hover:border-border-secondary",
                !isSelected && count >= NUMBER_OF_ACTIVATABLE_SKILLS_FOR_CREATION && "opacity-40 cursor-not-allowed",
              )}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggle(skill)}
                disabled={!isSelected && count >= NUMBER_OF_ACTIVATABLE_SKILLS_FOR_CREATION}
                className="accent-accent-primary"
              />
              <span className="text-text-muted text-xs">{t(skillCategoryKeys[cat]!)}</span>
              <span>{t(skillNameKeys[name]!)}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function StepCombat({ state, update }: StepProps) {
  function setValue(name: string, value: number) {
    const clamped = Math.max(MIN_INITIAL_COMBAT_SKILL_VALUE, Math.min(MAX_INITIAL_COMBAT_SKILL_VALUE, value));
    update({ combatSkillValues: { ...state.combatSkillValues, [name]: clamped } });
  }

  function fillRandomValues() {
    const randomValues: Record<string, number> = {};
    for (const name of COMBAT_SKILL_NAMES) {
      randomValues[name] =
        Math.floor(Math.random() * (MAX_INITIAL_COMBAT_SKILL_VALUE - MIN_INITIAL_COMBAT_SKILL_VALUE + 1)) +
        MIN_INITIAL_COMBAT_SKILL_VALUE;
    }
    update({ combatSkillValues: randomValues });
  }

  return (
    <div>
      {/* Description */}
      <div className="mb-6 p-4 bg-bg-tertiary rounded-lg border border-border-primary">
        <p className="text-sm text-text-secondary mb-3">{t("wizardCombatDescription")}</p>
        <Button variant="secondary" size="sm" onClick={fillRandomValues}>
          {t("wizardCombatRandomFill")}
        </Button>
      </div>

      {/* Combat skill inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {COMBAT_SKILL_NAMES.map((name) => (
          <div
            key={name}
            className="flex items-center justify-between rounded-lg border border-border-primary px-4 py-3"
          >
            <span className="text-sm">{t(skillNameKeys[name]!)}</span>
            <input
              type="number"
              min={MIN_INITIAL_COMBAT_SKILL_VALUE}
              max={MAX_INITIAL_COMBAT_SKILL_VALUE}
              value={state.combatSkillValues[name]}
              onChange={(e) => setValue(name, parseInt(e.target.value, 10) || MIN_INITIAL_COMBAT_SKILL_VALUE)}
              className="w-16 rounded border border-border-primary bg-bg-tertiary px-2 py-1 text-center text-sm font-mono focus:outline-none focus:ring-2 focus:ring-border-focus"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function StepReview({ state }: { state: WizardState }) {
  return (
    <div className="space-y-6">
      {/* General */}
      <div>
        <h3 className="text-sm font-semibold text-text-secondary mb-2">{t("wizardStepGeneral")}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
          <div>
            <span className="text-text-muted">{t("characterName")}:</span> {state.name}
          </div>
          <div>
            <span className="text-text-muted">{t("sex")}:</span> {state.sex}
          </div>
          <div>
            <span className="text-text-muted">{t("birthday")}:</span> {state.birthday}
          </div>
        </div>
      </div>

      {/* Profession / Hobby */}
      <div>
        <h3 className="text-sm font-semibold text-text-secondary mb-2">{t("wizardStepProfession")}</h3>
        <div className="text-sm space-y-1">
          <div>
            <span className="text-text-muted">{t("profession")}:</span> {state.professionName}
          </div>
          <div>
            <span className="text-text-muted">{t("hobby")}:</span> {state.hobbyName}
          </div>
        </div>
      </div>

      {/* Attributes */}
      <div>
        <h3 className="text-sm font-semibold text-text-secondary mb-2">{t("wizardStepAttributes")}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {ATTRIBUTE_NAMES.map((attr) => (
            <div key={attr} className="flex justify-between text-sm rounded border border-border-primary px-2 py-1">
              <span className="text-text-muted">{t(attr as keyof typeof import("@/i18n/de").default)}</span>
              <span className="font-mono font-bold">{state.attributes[attr]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Advantages & Disadvantages */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-semibold text-text-secondary mb-2">{t("advantages")}</h3>
          {state.selectedAdvantages.length === 0 ? (
            <p className="text-sm text-text-muted">—</p>
          ) : (
            <div className="space-y-1">
              {state.selectedAdvantages.map((a, i) => (
                <div key={i} className="text-sm flex justify-between">
                  <span>{t(advantageNameKeys[a[0]]!)}</span>
                  <Badge variant="warning">{a[2]}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-text-secondary mb-2">{t("disadvantages")}</h3>
          {state.selectedDisadvantages.length === 0 ? (
            <p className="text-sm text-text-muted">—</p>
          ) : (
            <div className="space-y-1">
              {state.selectedDisadvantages.map((d, i) => (
                <div key={i} className="text-sm flex justify-between">
                  <span>{t(disadvantageNameKeys[d[0]]!)}</span>
                  <Badge variant="success">+{d[2]}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Activated Skills */}
      <div>
        <h3 className="text-sm font-semibold text-text-secondary mb-2">{t("wizardStepSkills")}</h3>
        <div className="flex flex-wrap gap-2">
          {state.activatedSkills.map((skill) => {
            const name = skill.split("/")[1]!;
            return <Badge key={skill}>{t(skillNameKeys[name]!)}</Badge>;
          })}
        </div>
      </div>
    </div>
  );
}
