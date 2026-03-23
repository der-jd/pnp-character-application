import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { clsx } from "clsx";
import type { Skill, LearningMethodString, SkillCategory } from "api-spec";
import { skillCategories } from "api-spec";
import { t } from "@/i18n";
import { fetchCharacter } from "@/api/characters";
import { updateSkill, getSkillIncreaseCost } from "@/api/character-edit";
import { ApiError } from "@/api/client";
import { skillNameKeys, skillCategoryKeys, learningMethodKeys } from "@/i18n/mappings";
import { getSkillIcon, skillCategoryIcons } from "@/lib/skillIcons";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { Dialog } from "@/components/ui/Dialog";

const LEARNING_METHODS: LearningMethodString[] = ["FREE", "LOW_PRICED", "NORMAL", "EXPENSIVE"];

export function SkillsPage() {
  const { characterId } = useParams<{ characterId: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: character, isLoading } = useQuery({
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
  const [costPreview, setCostPreview] = useState<number | null>(null);
  const [loadingCost, setLoadingCost] = useState(false);

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

  async function fetchCost(category: string, name: string, method: LearningMethodString) {
    setLoadingCost(true);
    try {
      const res = await getSkillIncreaseCost(characterId!, category, name, method);
      setCostPreview(res.increaseCost);
    } catch {
      setCostPreview(null);
    } finally {
      setLoadingCost(false);
    }
  }

  function openEdit(category: string, name: string, skill: Skill) {
    setEditingSkill({ category, name, skill });
    setEditValues({ start: skill.start, current: skill.current, mod: skill.mod, activated: skill.activated });
    setLearningMethod("NORMAL");
    setCostPreview(null);
    fetchCost(category, name, "NORMAL");
  }

  if (isLoading) return <FullPageSpinner />;
  if (!character) return <div className="text-accent-danger p-4">{t("toastLoadError")}</div>;

  const skills = character.characterSheet.skills;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("skills")}</h1>

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
                    <th className="text-center py-2 px-2 font-medium">{t("totalCost")}</th>
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
                  onChange={(e) => setEditValues((v) => ({ ...v, current: Number(e.target.value) }))}
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
                {LEARNING_METHODS.map((method) => (
                  <button
                    key={method}
                    onClick={() => {
                      setLearningMethod(method);
                      fetchCost(editingSkill.category, editingSkill.name, method);
                    }}
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

            {costPreview !== null && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted">{t("increaseCost")}:</span>
                <Badge variant={loadingCost ? "default" : "info"}>{loadingCost ? "..." : costPreview}</Badge>
              </div>
            )}
          </div>
        </Dialog>
      )}
    </div>
  );
}
