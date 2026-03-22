import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { CombatStats } from "api-spec";
import { t } from "@/i18n";
import { fetchCharacter } from "@/api/characters";
import { updateCombatStats } from "@/api/character-edit";
import { skillNameKeys } from "@/i18n/mappings";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

export function CombatPage() {
  const { characterId } = useParams<{ characterId: string }>();

  const { data: character, isLoading } = useQuery({
    queryKey: ["character", characterId],
    queryFn: () => fetchCharacter(characterId!),
    enabled: !!characterId,
  });

  if (isLoading) return <FullPageSpinner />;
  if (!character) return <div className="text-accent-danger p-4">{t("toastLoadError")}</div>;

  const combat = character.characterSheet.combat;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("combat")}</h1>

      <Card title={t("combatMelee")}>
        <CombatTable characterId={characterId!} category="melee" stats={combat.melee} />
      </Card>

      <Card title={t("combatRanged")}>
        <CombatTable characterId={characterId!} category="ranged" stats={combat.ranged} />
      </Card>
    </div>
  );
}

function CombatTable({
  characterId,
  category,
  stats,
}: {
  characterId: string;
  category: string;
  stats: Record<string, CombatStats>;
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
    onError: () => toast("error", t("toastSaveError")),
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
            <th className="text-center py-2 px-2 font-medium">{t("attackValue")}</th>
            <th className="text-center py-2 px-2 font-medium">{t("skilledAttackValue")}</th>
            <th className="text-center py-2 px-2 font-medium">{t("paradeValue")}</th>
            <th className="text-center py-2 px-2 font-medium">{t("skilledParadeValue")}</th>
            <th className="py-2 w-20"></th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(stats).map(([name, cs]) => (
            <tr key={name} className="border-b border-border-primary/50 hover:bg-bg-hover/30">
              <td className="py-2 pr-4 font-medium">{t(skillNameKeys[name]!)}</td>
              <td className="text-center py-2 px-2 font-mono">{cs.availablePoints}</td>
              <td className="text-center py-2 px-2 font-mono">{cs.handling}</td>
              <td className="text-center py-2 px-2 font-mono">{cs.attackValue}</td>
              <td className="text-center py-2 px-2">
                {editing === name ? (
                  <input
                    type="number"
                    value={editValues.skilledAttack}
                    onChange={(e) => setEditValues((v) => ({ ...v, skilledAttack: Number(e.target.value) }))}
                    className="w-14 rounded border border-border-primary bg-bg-tertiary px-1 py-0.5 text-center text-sm font-mono"
                  />
                ) : (
                  <span className="font-mono">{cs.skilledAttackValue}</span>
                )}
              </td>
              <td className="text-center py-2 px-2 font-mono">{cs.paradeValue}</td>
              <td className="text-center py-2 px-2">
                {editing === name ? (
                  <input
                    type="number"
                    value={editValues.skilledParade}
                    onChange={(e) => setEditValues((v) => ({ ...v, skilledParade: Number(e.target.value) }))}
                    className="w-14 rounded border border-border-primary bg-bg-tertiary px-1 py-0.5 text-center text-sm font-mono"
                  />
                ) : (
                  <span className="font-mono">{cs.skilledParadeValue}</span>
                )}
              </td>
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
