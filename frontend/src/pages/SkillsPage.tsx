import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { clsx } from "clsx";
import type { Skill, LearningMethodString, SkillCategory } from "api-spec";
import {
  skillCategories,
  CostCategory,
  LearningMethod,
  learningMethodSchema,
  calculateTotalSkillIncreaseCost,
  getSkillActivationCost,
  getSkillIncreaseCost,
  adjustCostCategory,
} from "api-spec";
import { t } from "@/i18n";
import { fetchCharacter } from "@/api/characters";
import { updateSkill } from "@/api/character-edit";
import { ApiError } from "@/api/client";
import { skillNameKeys, skillCategoryKeys, learningMethodKeys } from "@/i18n/mappings";
import { getSkillIcon, skillCategoryIcons } from "@/lib/skillIcons";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { useToast } from "@/components/ui/Toast";

export function SkillsPage() {
  const { characterId } = useParams<{ characterId: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: character,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["character", characterId],
    queryFn: () => fetchCharacter(characterId!),
    enabled: !!characterId,
  });

  // Editing state
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [editValues, setEditValues] = useState({ start: 0, current: 0, mod: 0, activated: false });
  const [learningMethod, setLearningMethod] = useState<LearningMethodString>("NORMAL");

  function startEdit(category: string, name: string, skill: Skill) {
    setEditingKey(`${category}/${name}`);
    setEditingSkill(skill);
    setEditValues({ start: skill.start, current: skill.current, mod: skill.mod, activated: skill.activated });
  }

  function cancelEdit() {
    setEditingKey(null);
    setEditingSkill(null);
  }

  const lm = LearningMethod[learningMethod as keyof typeof LearningMethod];

  // Calculate projected cost locally using shared cost rules
  const projectedCost = useMemo(() => {
    if (!editingSkill) return null;

    let totalCost = 0;

    if (editValues.activated && !editingSkill.activated) {
      const adjustedCategory = adjustCostCategory(editingSkill.defaultCostCategory as CostCategory, lm);
      totalCost += getSkillActivationCost(adjustedCategory);
    }

    const increasedPoints = editValues.current - editingSkill.current;
    if (increasedPoints > 0) {
      totalCost += calculateTotalSkillIncreaseCost(
        editingSkill.current,
        increasedPoints,
        editingSkill.defaultCostCategory as CostCategory,
        lm,
      );
    }

    return totalCost;
  }, [editingSkill, editValues.current, editValues.activated, lm]);

  // Calculate projected available AP
  const projectedAp = useMemo(() => {
    if (!character || projectedCost === null || projectedCost === 0) return null;
    const available = character.characterSheet.calculationPoints.adventurePoints.available;
    return available - projectedCost;
  }, [character, projectedCost]);

  const skillMutation = useMutation({
    mutationFn: ({ category, name }: { category: string; name: string }) => {
      const skill = editingSkill!;
      return updateSkill(characterId!, category, name, {
        activated: editValues.activated !== skill.activated ? editValues.activated : undefined,
        start: editValues.start !== skill.start ? { initialValue: skill.start, newValue: editValues.start } : undefined,
        current:
          editValues.current !== skill.current
            ? { initialValue: skill.current, increasedPoints: editValues.current - skill.current }
            : undefined,
        mod: editValues.mod !== skill.mod ? { initialValue: skill.mod, newValue: editValues.mod } : undefined,
        learningMethod: learningMethod,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["character", characterId] });
      toast("success", t("toastSaveSuccess"));
      cancelEdit();
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast("error", error.message);
      } else {
        toast("error", t("toastSaveError"));
      }
    },
  });

  function saveEdit(category: string, name: string) {
    const skill = editingSkill!;
    const hasChanges =
      editValues.start !== skill.start ||
      editValues.current !== skill.current ||
      editValues.mod !== skill.mod ||
      editValues.activated !== skill.activated;
    if (!hasChanges) {
      cancelEdit();
      return;
    }
    skillMutation.mutate({ category, name });
  }

  if (isLoading) return <FullPageSpinner />;
  if (!character) return <ErrorState onRetry={() => refetch()} />;

  const skills = character.characterSheet.skills;
  const ap = character.characterSheet.calculationPoints.adventurePoints;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("skills")}</h1>

      {/* Adventure Points & Learning Method */}
      <Card className="sticky top-0 z-10 bg-bg-primary border-border-primary shadow-sm">
        <div className="flex gap-4 flex-wrap items-center justify-between">
          <div className="flex gap-4 flex-wrap items-center">
            <Badge
              variant={
                projectedAp !== null
                  ? projectedAp < 0
                    ? "danger"
                    : projectedAp === 0
                      ? "info"
                      : "success"
                  : ap.available < 0
                    ? "danger"
                    : ap.available === 0
                      ? "info"
                      : "success"
              }
            >
              {t("availableAp")}: {projectedAp !== null ? projectedAp : ap.available}
              {projectedAp !== null && projectedCost !== null && (
                <span className="ml-1 text-xs opacity-75">(-{projectedCost})</span>
              )}
            </Badge>
            <Badge variant="default">
              {t("totalAp")}: {ap.total}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted font-medium">{t("learningMethod")}:</span>
            {learningMethodSchema.options.map((method) => (
              <button
                key={method}
                onClick={() => setLearningMethod(method)}
                className={clsx(
                  "px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer",
                  learningMethod === method
                    ? "bg-accent-primary text-white"
                    : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover",
                )}
              >
                {t(learningMethodKeys[method]!)}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {skillCategories.map((category) => {
        const categorySkills = skills[category as SkillCategory] as Record<string, Skill>;
        return (
          <Card
            key={category}
            title={
              <span className="flex items-center gap-2">
                <span className="text-accent-primary">{skillCategoryIcons[category]}</span>
                {t(skillCategoryKeys[category]!)}
              </span>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-primary text-text-muted text-xs">
                    <th className="text-left py-2 pr-4 font-medium w-6"></th>
                    <th className="text-left py-2 pr-4 font-medium">{t("skills")}</th>
                    <th className="text-center py-2 px-2 font-medium">{t("activated")}</th>
                    <th className="text-center py-2 px-2 font-medium">{t("start")}</th>
                    <th className="text-center py-2 px-2 font-medium">{t("current")}</th>
                    <th className="text-center py-2 px-2 font-medium">{t("mod")}</th>
                    <th className="text-center py-2 px-2 font-medium">{t("totalCostAdventurePoints")}</th>
                    <th className="text-center py-2 px-2 font-medium">{t("costCategory")}</th>
                    <th className="text-center py-2 px-2 font-medium">{t("nextPointCost")}</th>
                    <th className="text-center py-2 px-2 font-medium">{t("activationCostColumn")}</th>
                    <th className="py-2 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(categorySkills).map(([name, skill]) => {
                    const key = `${category}/${name}`;
                    const isEditing = editingKey === key;
                    const adjustedCategory = adjustCostCategory(skill.defaultCostCategory as CostCategory, lm);
                    const nextPointCost = getSkillIncreaseCost(skill.current, adjustedCategory);
                    const activationCost = !skill.activated ? getSkillActivationCost(adjustedCategory) : null;
                    const dim = !skill.activated && !isEditing;

                    return (
                      <tr key={name} className="border-b border-border-primary/50 hover:bg-bg-hover/30">
                        <td className={clsx("py-2 text-text-muted", dim && "opacity-40")}>{getSkillIcon(name)}</td>
                        <td className={clsx("py-2 pr-4 font-medium", dim && "opacity-40")}>
                          {t(skillNameKeys[name]!)}
                        </td>
                        <td className={clsx("text-center py-2 px-2", dim && "opacity-40")}>
                          {isEditing && !skill.activated ? (
                            <input
                              type="checkbox"
                              checked={editValues.activated}
                              onChange={(e) => setEditValues((v) => ({ ...v, activated: e.target.checked }))}
                              className="h-4 w-4 rounded border-border-primary bg-bg-tertiary text-accent-primary focus:ring-2 focus:ring-accent-primary cursor-pointer"
                            />
                          ) : (
                            <span
                              className={clsx(
                                "inline-block h-2 w-2 rounded-full",
                                skill.activated ? "bg-accent-success" : "bg-bg-tertiary",
                              )}
                            />
                          )}
                        </td>
                        <td className={clsx("text-center py-2 px-2", dim && "opacity-40")}>
                          {isEditing ? (
                            <input
                              type="number"
                              value={editValues.start}
                              onChange={(e) => setEditValues((v) => ({ ...v, start: Number(e.target.value) }))}
                              className="w-14 rounded border border-border-primary bg-bg-tertiary px-1 py-0.5 text-center text-sm font-mono"
                            />
                          ) : (
                            <span className="font-mono">{skill.start}</span>
                          )}
                        </td>
                        <td className={clsx("text-center py-2 px-2", dim && "opacity-40")}>
                          {isEditing ? (
                            <input
                              type="number"
                              value={editValues.current}
                              min={skill.current}
                              onChange={(e) => {
                                const newValue = Number(e.target.value);
                                if (newValue >= skill.current) {
                                  setEditValues((v) => ({ ...v, current: newValue }));
                                }
                              }}
                              className="w-14 rounded border border-border-primary bg-bg-tertiary px-1 py-0.5 text-center text-sm font-mono"
                            />
                          ) : (
                            <span className="font-mono">{skill.current}</span>
                          )}
                        </td>
                        <td className={clsx("text-center py-2 px-2", dim && "opacity-40")}>
                          {isEditing ? (
                            <input
                              type="number"
                              value={editValues.mod}
                              onChange={(e) => setEditValues((v) => ({ ...v, mod: Number(e.target.value) }))}
                              className="w-14 rounded border border-border-primary bg-bg-tertiary px-1 py-0.5 text-center text-sm font-mono"
                            />
                          ) : (
                            <span className="font-mono">{skill.mod}</span>
                          )}
                        </td>
                        <td className={clsx("text-center py-2 px-2 font-mono text-text-muted", dim && "opacity-40")}>
                          {skill.totalCost}
                        </td>
                        <td className={clsx("text-center py-2 px-2", dim && "opacity-40")}>
                          <Badge>{`${t("costCategoryAbbr")} ${skill.defaultCostCategory}`}</Badge>
                        </td>
                        <td className={clsx("text-center py-2 px-2 font-mono", dim && "opacity-40")}>
                          {nextPointCost}
                        </td>
                        <td className={clsx("text-center py-2 px-2 font-mono text-text-muted", dim && "opacity-40")}>
                          {activationCost !== null ? activationCost : "—"}
                        </td>
                        <td className="py-2 text-right">
                          {isEditing ? (
                            <div className="flex gap-1 justify-end">
                              <Button variant="ghost" size="sm" onClick={cancelEdit}>
                                {t("cancel")}
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => saveEdit(category, name)}
                                loading={skillMutation.isPending}
                              >
                                {t("save")}
                              </Button>
                            </div>
                          ) : (
                            <Button variant="ghost" size="sm" onClick={() => startEdit(category, name, skill)}>
                              {t("edit")}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
