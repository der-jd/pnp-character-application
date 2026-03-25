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
import { Dialog } from "@/components/ui/Dialog";

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

  const [editingSkill, setEditingSkill] = useState<{
    category: string;
    name: string;
    skill: Skill;
  } | null>(null);

  const [editValues, setEditValues] = useState({ start: 0, current: 0, mod: 0, activated: false });
  const [learningMethod, setLearningMethod] = useState<LearningMethodString>("NORMAL");

  // Calculate projected cost locally using shared cost rules
  const projectedCost = useMemo(() => {
    if (!editingSkill) return null;

    const skill = editingSkill.skill;
    const lm = LearningMethod[learningMethod as keyof typeof LearningMethod];
    let totalCost = 0;

    // Activation cost (only if activating a not-yet-activated skill)
    if (editValues.activated && !skill.activated) {
      const adjustedCategory = adjustCostCategory(skill.defaultCostCategory as CostCategory, lm);
      totalCost += getSkillActivationCost(adjustedCategory);
    }

    // Increase cost (only if current is increasing)
    const increasedPoints = editValues.current - skill.current;
    if (increasedPoints > 0) {
      totalCost += calculateTotalSkillIncreaseCost(
        skill.current,
        increasedPoints,
        skill.defaultCostCategory as CostCategory,
        lm,
      );
    }

    return totalCost;
  }, [editingSkill, editValues.current, editValues.activated, learningMethod]);

  // Calculate projected available AP
  const projectedAp = useMemo(() => {
    if (!character || projectedCost === null || projectedCost === 0) return null;
    const available = character.characterSheet.calculationPoints.adventurePoints.available;
    return available - projectedCost;
  }, [character, projectedCost]);

  const skillMutation = useMutation({
    mutationFn: ({ category, name }: { category: string; name: string }) =>
      updateSkill(characterId!, category, name, {
        activated: editValues.activated !== editingSkill?.skill.activated ? editValues.activated : undefined,
        start:
          editValues.start !== editingSkill?.skill.start
            ? { initialValue: editingSkill!.skill.start, newValue: editValues.start }
            : undefined,
        current:
          editValues.current !== editingSkill?.skill.current
            ? {
                initialValue: editingSkill!.skill.current,
                increasedPoints: editValues.current - editingSkill!.skill.current,
              }
            : undefined,
        mod:
          editValues.mod !== editingSkill?.skill.mod
            ? { initialValue: editingSkill!.skill.mod, newValue: editValues.mod }
            : undefined,
        learningMethod: learningMethod,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["character", characterId] });
      toast("success", t("toastSaveSuccess"));
      setEditingSkill(null);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast("error", error.message);
      } else {
        toast("error", t("toastSaveError"));
      }
    },
  });

  function openEdit(category: string, name: string, skill: Skill) {
    setEditingSkill({ category, name, skill });
    setEditValues({ start: skill.start, current: skill.current, mod: skill.mod, activated: skill.activated });
    setLearningMethod("NORMAL");
  }

  if (isLoading) return <FullPageSpinner />;
  if (!character) return <ErrorState onRetry={() => refetch()} />;

  const skills = character.characterSheet.skills;
  const ap = character.characterSheet.calculationPoints.adventurePoints;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("skills")}</h1>

      {/* Adventure Points Summary */}
      <Card className="sticky top-0 z-10 bg-bg-primary border-border-primary shadow-sm">
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
                    <th className="py-2 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(categorySkills).map(([name, skill]) => (
                    <tr
                      key={name}
                      className={clsx(
                        "border-b border-border-primary/50 hover:bg-bg-hover/30",
                        !skill.activated && "opacity-40",
                      )}
                    >
                      <td className="py-2 text-text-muted">{getSkillIcon(name)}</td>
                      <td className="py-2 pr-4 font-medium">{t(skillNameKeys[name]!)}</td>
                      <td className="text-center py-2 px-2">
                        <span
                          className={clsx(
                            "inline-block h-2 w-2 rounded-full",
                            skill.activated ? "bg-accent-success" : "bg-bg-tertiary",
                          )}
                        />
                      </td>
                      <td className="text-center py-2 px-2 font-mono">{skill.start}</td>
                      <td className="text-center py-2 px-2 font-mono">{skill.current}</td>
                      <td className="text-center py-2 px-2 font-mono">{skill.mod}</td>
                      <td className="text-center py-2 px-2 font-mono text-text-muted">{skill.totalCost}</td>
                      <td className="text-center py-2 px-2">
                        <Badge>{`${t("costCategoryAbbr")} ${skill.defaultCostCategory}`}</Badge>
                      </td>
                      <td className="py-2 text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(category, name, skill)}>
                          {t("edit")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        );
      })}

      {/* Edit Dialog */}
      {editingSkill && (
        <Dialog
          open
          onClose={() => setEditingSkill(null)}
          title={`${t("edit")}: ${t(skillNameKeys[editingSkill.name]!)}`}
          actions={
            <>
              <Button variant="secondary" onClick={() => setEditingSkill(null)}>
                {t("cancel")}
              </Button>
              <Button
                onClick={() => skillMutation.mutate({ category: editingSkill.category, name: editingSkill.name })}
                loading={skillMutation.isPending}
              >
                {t("save")}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label
                className={clsx(
                  "flex items-center gap-2",
                  editingSkill?.skill.activated ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                )}
              >
                <input
                  type="checkbox"
                  checked={editValues.activated}
                  onChange={(e) => setEditValues((v) => ({ ...v, activated: e.target.checked }))}
                  disabled={editingSkill?.skill.activated}
                  className="h-4 w-4 rounded border-border-primary bg-bg-tertiary text-accent-primary focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-bg-primary disabled:cursor-not-allowed disabled:opacity-50"
                />
                <span className="text-sm font-medium">{t("skillActivated")}</span>
              </label>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-text-muted block mb-1">{t("start")}</label>
                <input
                  type="number"
                  value={editValues.start}
                  onChange={(e) => setEditValues((v) => ({ ...v, start: Number(e.target.value) }))}
                  className="w-full rounded border border-border-primary bg-bg-tertiary px-2 py-1.5 text-center text-sm font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1">{t("current")}</label>
                <input
                  type="number"
                  value={editValues.current}
                  min={editingSkill?.skill.current}
                  onChange={(e) => {
                    const newValue = Number(e.target.value);
                    // Prevent reductions of current values (not allowed by backend)
                    if (newValue >= (editingSkill?.skill.current || 0)) {
                      setEditValues((v) => ({ ...v, current: newValue }));
                    }
                  }}
                  className="w-full rounded border border-border-primary bg-bg-tertiary px-2 py-1.5 text-center text-sm font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1">{t("mod")}</label>
                <input
                  type="number"
                  value={editValues.mod}
                  onChange={(e) => setEditValues((v) => ({ ...v, mod: Number(e.target.value) }))}
                  className="w-full rounded border border-border-primary bg-bg-tertiary px-2 py-1.5 text-center text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-text-muted block mb-1">{t("learningMethod")}</label>
              <div className="flex gap-2">
                {learningMethodSchema.options.map((method) => (
                  <button
                    key={method}
                    onClick={() => setLearningMethod(method)}
                    className={clsx(
                      "px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer",
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

            {/* Live cost preview */}
            {projectedCost !== null && projectedCost > 0 && (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">{t("increaseCost")}:</span>
                  <Badge variant="info">{projectedCost}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">{t("availableAp")}:</span>
                  <Badge variant={projectedAp !== null && projectedAp < 0 ? "danger" : "success"}>{projectedAp}</Badge>
                </div>
              </div>
            )}
          </div>
        </Dialog>
      )}
    </div>
  );
}
