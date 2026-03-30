import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { clsx } from "clsx";
import type { CombatStats, Character } from "api-spec";
import { t } from "@/i18n";
import { fetchCharacter } from "@/api/characters";
import { updateCombatStats } from "@/api/character-edit";
import { ApiError } from "@/api/client";
import { skillNameKeys } from "@/i18n/mappings";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { useToast } from "@/components/ui/Toast";

export function CombatPage() {
  const { characterId } = useParams<{ characterId: string }>();

  const {
    data: character,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["character", characterId],
    queryFn: () => fetchCharacter(characterId!),
    enabled: !!characterId,
  });

  if (isLoading) return <FullPageSpinner />;
  if (!character) return <ErrorState onRetry={() => refetch()} />;

  const combat = character.characterSheet.combat;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("combat")}</h1>

      <Card
        title={
          <div className="flex items-center gap-2">
            {t("combatMelee")}
            <Badge variant="default">
              {t("attackBaseValue")}:{" "}
              {character.characterSheet.baseValues.attackBaseValue.current +
                character.characterSheet.baseValues.attackBaseValue.mod}
            </Badge>
            <Badge variant="default">
              {t("paradeBaseValue")}:{" "}
              {character.characterSheet.baseValues.paradeBaseValue.current +
                character.characterSheet.baseValues.paradeBaseValue.mod}
            </Badge>
          </div>
        }
      >
        <CombatTable characterId={characterId!} category="melee" stats={combat.melee} character={character} />
      </Card>

      <Card
        title={
          <div className="flex items-center gap-2">
            {t("combatRanged")}
            <Badge variant="default">
              {t("rangedAttackBaseValue")}:{" "}
              {character.characterSheet.baseValues.rangedAttackBaseValue.current +
                character.characterSheet.baseValues.rangedAttackBaseValue.mod}
            </Badge>
          </div>
        }
      >
        <CombatTable characterId={characterId!} category="ranged" stats={combat.ranged} character={character} />
      </Card>
    </div>
  );
}

function CombatTable({
  characterId,
  category,
  stats,
  character,
}: {
  characterId: string;
  category: string;
  stats: Record<string, CombatStats>;
  character: Character;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ skilledAttack: 0, skilledParade: 0 });

  const mutation = useMutation({
    mutationFn: ({ name }: { name: string }) => {
      const original = stats[name]!;
      return updateCombatStats(characterId, category, name, {
        skilledAttackValue: {
          initialValue: original.skilledAttackValue,
          increasedPoints: editValues.skilledAttack - original.skilledAttackValue,
        },
        skilledParadeValue: {
          initialValue: original.skilledParadeValue,
          increasedPoints: editValues.skilledParade - original.skilledParadeValue,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["character", characterId] });
      toast("success", t("toastSaveSuccess"));
      setEditing(null);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast("error", error.message);
      } else {
        toast("error", t("toastSaveError"));
      }
    },
  });

  function startEdit(name: string, cs: CombatStats) {
    setEditing(name);
    setEditValues({ skilledAttack: cs.skilledAttackValue, skilledParade: cs.skilledParadeValue });
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-primary text-text-muted text-xs">
            <th className="text-left py-2 pr-4 font-medium">{t("combat")}</th>
            <th className="text-center py-2 px-2 font-medium">{t("availablePoints")}</th>
            <th className="text-center py-2 px-2 font-medium">{t("handling")}</th>
            <th className="text-center py-2 px-2 font-medium">{t("skilledAttackValue")}</th>
            <th className="text-center py-2 px-2 font-medium">{t("attackValue")}</th>
            {category === "melee" && (
              <>
                <th className="text-center py-2 px-2 font-medium">{t("skilledParadeValue")}</th>
                <th className="text-center py-2 px-2 font-medium">{t("paradeValue")}</th>
              </>
            )}
            <th className="py-2 w-20"></th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(stats).map(([name, cs]) => {
            const totalPoints =
              cs.handling +
              character.characterSheet.skills.combat[name as keyof typeof character.characterSheet.skills.combat]
                .current +
              character.characterSheet.skills.combat[name as keyof typeof character.characterSheet.skills.combat].mod;
            const projectedAvailable =
              editing === name
                ? cs.availablePoints -
                  (editValues.skilledAttack - cs.skilledAttackValue) -
                  (editValues.skilledParade - cs.skilledParadeValue)
                : cs.availablePoints;
            const projectedAttackValue =
              editing === name ? cs.attackValue + (editValues.skilledAttack - cs.skilledAttackValue) : cs.attackValue;
            const projectedParadeValue =
              editing === name ? cs.paradeValue + (editValues.skilledParade - cs.skilledParadeValue) : cs.paradeValue;

            return (
              <tr key={name} className="border-b border-border-primary/50 hover:bg-bg-hover/30">
                <td className="py-2 pr-4 font-medium">{t(skillNameKeys[name]!)}</td>
                <td
                  className={clsx(
                    "text-center py-2 px-2 font-mono",
                    projectedAvailable > 0 && "text-accent-success",
                    projectedAvailable === 0 && "opacity-40",
                    projectedAvailable < 0 && "text-accent-danger",
                  )}
                >
                  {projectedAvailable}/{totalPoints}
                </td>
                <td className="text-center py-2 px-2 font-mono">{cs.handling}</td>
                <td className="text-center py-2 px-2">
                  {editing === name ? (
                    <input
                      type="number"
                      min={cs.skilledAttackValue}
                      value={editValues.skilledAttack}
                      onChange={(e) =>
                        setEditValues((v) => ({
                          ...v,
                          skilledAttack: Math.max(cs.skilledAttackValue, Number(e.target.value)),
                        }))
                      }
                      className="w-14 rounded border border-border-primary bg-bg-tertiary px-1 py-0.5 text-center text-sm font-mono"
                    />
                  ) : (
                    <span className="font-mono">{cs.skilledAttackValue}</span>
                  )}
                </td>
                <td className="text-center py-2 px-2 font-mono">{projectedAttackValue}</td>
                {category === "melee" && (
                  <>
                    <td className="text-center py-2 px-2">
                      {editing === name ? (
                        <input
                          type="number"
                          min={cs.skilledParadeValue}
                          value={editValues.skilledParade}
                          onChange={(e) =>
                            setEditValues((v) => ({
                              ...v,
                              skilledParade: Math.max(cs.skilledParadeValue, Number(e.target.value)),
                            }))
                          }
                          className="w-14 rounded border border-border-primary bg-bg-tertiary px-1 py-0.5 text-center text-sm font-mono"
                        />
                      ) : (
                        <span className="font-mono">{cs.skilledParadeValue}</span>
                      )}
                    </td>
                    <td className="text-center py-2 px-2 font-mono">{projectedParadeValue}</td>
                  </>
                )}
                <td className="py-2 text-right">
                  {editing === name ? (
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
                        {t("cancel")}
                      </Button>
                      <Button size="sm" onClick={() => mutation.mutate({ name })} loading={mutation.isPending}>
                        {t("save")}
                      </Button>
                    </div>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => startEdit(name, cs)}>
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
  );
}
