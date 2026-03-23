import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { clsx } from "clsx";
import {
  LEVEL_UP_DICE_EXPRESSION,
  LEVEL_UP_DICE_MIN_TOTAL,
  LEVEL_UP_DICE_MAX_TOTAL,
  type LevelUpOption,
  type EffectByLevelUp,
} from "api-spec";
import { t } from "@/i18n";
import { fetchCharacter } from "@/api/characters";
import { fetchLevelUpOptions, applyLevelUp } from "@/api/level-up";
import { ApiError } from "@/api/client";
import { levelUpEffectKeys } from "@/i18n/mappings";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { useToast } from "@/components/ui/Toast";

export function LevelUpPage() {
  const { characterId } = useParams<{ characterId: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: character } = useQuery({
    queryKey: ["character", characterId],
    queryFn: () => fetchCharacter(characterId!),
    enabled: !!characterId,
  });

  const {
    data: levelUpData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["level-up", characterId],
    queryFn: () => fetchLevelUpOptions(characterId!),
    enabled: !!characterId,
  });

  const [selectedOption, setSelectedOption] = useState<LevelUpOption | null>(null);
  const [diceRoll, setDiceRoll] = useState(LEVEL_UP_DICE_MIN_TOTAL);

  const mutation = useMutation({
    mutationFn: () => {
      if (!selectedOption || !levelUpData) throw new Error("No option selected");
      const isDice = selectedOption.kind === "hpRoll" || selectedOption.kind === "armorLevelRoll";
      const effect: EffectByLevelUp = isDice
        ? {
            kind: selectedOption.kind as "hpRoll" | "armorLevelRoll",
            roll: { dice: LEVEL_UP_DICE_EXPRESSION, value: diceRoll },
          }
        : selectedOption.kind === "rerollUnlock"
          ? { kind: "rerollUnlock" }
          : {
              kind: selectedOption.kind as
                | "initiativePlusOne"
                | "luckPlusOne"
                | "bonusActionPlusOne"
                | "legendaryActionPlusOne",
              delta: 1,
            };

      return applyLevelUp(characterId!, {
        initialLevel: character!.characterSheet.generalInformation.level,
        effect,
        optionsHash: levelUpData.optionsHash,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["character", characterId] });
      queryClient.invalidateQueries({ queryKey: ["level-up", characterId] });
      toast("success", t("levelUpSuccess"));
      setSelectedOption(null);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast("error", error.message);
      } else {
        toast("error", t("toastSaveError"));
      }
    },
  });

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorState onRetry={() => refetch()} />;

  const currentLevel = character?.characterSheet.generalInformation.level ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("levelUpTitle")}</h1>
        <div className="flex items-center gap-3">
          <Badge variant="info">
            {t("levelUpCurrentLevel")}: {currentLevel}
          </Badge>
          {levelUpData && (
            <Badge variant="success">
              {t("levelUpNextLevel")}: {levelUpData.nextLevel}
            </Badge>
          )}
        </div>
      </div>

      {!levelUpData || levelUpData.options.length === 0 ? (
        <Card>
          <p className="text-text-muted text-center py-8">{t("levelUpNoOptions")}</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {levelUpData.options.map((option) => {
            const isSelected = selectedOption?.kind === option.kind;
            const isDice = option.kind === "hpRoll" || option.kind === "armorLevelRoll";

            return (
              <div
                key={option.kind}
                className={clsx(
                  "rounded-lg border p-4 transition-colors",
                  option.allowed
                    ? isSelected
                      ? "border-accent-primary bg-accent-primary/5 cursor-pointer"
                      : "border-border-primary hover:border-border-secondary cursor-pointer"
                    : "border-border-primary opacity-50 cursor-not-allowed",
                )}
                onClick={() => {
                  if (option.allowed) setSelectedOption(isSelected ? null : option);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={clsx(
                        "h-4 w-4 rounded-full border-2 flex items-center justify-center",
                        isSelected ? "border-accent-primary" : "border-border-secondary",
                      )}
                    >
                      {isSelected && <div className="h-2 w-2 rounded-full bg-accent-primary" />}
                    </div>
                    <div>
                      <p className="font-medium">{t(levelUpEffectKeys[option.kind]!)}</p>
                      <p className="text-xs text-text-muted">{option.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {option.selectionCount > 0 && (
                      <Badge variant="default">{t("levelUpSelections", option.selectionCount)}</Badge>
                    )}
                    {!option.allowed && option.reasonIfDenied && (
                      <Badge variant="danger">{option.reasonIfDenied}</Badge>
                    )}
                    {isDice && option.diceExpression && <Badge variant="info">{option.diceExpression}</Badge>}
                  </div>
                </div>

                {/* Dice roll input */}
                {isSelected && isDice && (
                  <div className="mt-4 pl-7">
                    <label className="text-sm text-text-secondary block mb-1">
                      {t("levelUpDiceRoll", LEVEL_UP_DICE_EXPRESSION)}
                    </label>
                    <p className="text-xs text-text-muted mb-2">
                      {t("levelUpDiceRollHint", LEVEL_UP_DICE_MIN_TOTAL, LEVEL_UP_DICE_MAX_TOTAL)}
                    </p>
                    <input
                      type="number"
                      min={LEVEL_UP_DICE_MIN_TOTAL}
                      max={LEVEL_UP_DICE_MAX_TOTAL}
                      value={diceRoll}
                      onChange={(e) => setDiceRoll(Number(e.target.value))}
                      onClick={(e) => e.stopPropagation()}
                      className="w-20 rounded border border-border-primary bg-bg-tertiary px-3 py-1.5 text-center text-sm font-mono focus:outline-none focus:ring-2 focus:ring-border-focus"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          onClick={() => mutation.mutate()}
          loading={mutation.isPending}
          disabled={!selectedOption || mutation.isPending}
        >
          {t("levelUpApply")}
        </Button>
      </div>
    </div>
  );
}
