import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { t } from "@/i18n";
import { fetchCharacter } from "@/api/characters";
import { updateCalculationPoints } from "@/api/character-edit";
import { updateHistoryComment } from "@/api/history";
import { ApiError } from "@/api/client";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

interface EventDialogProps {
  open: boolean;
  onClose: () => void;
  characterId: string;
}

export function EventDialog({ open, onClose, characterId }: EventDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [eventName, setEventName] = useState("");
  const [adventurePoints, setAdventurePoints] = useState("");
  const [attributePoints, setAttributePoints] = useState("");

  const { data: character } = useQuery({
    queryKey: ["character", characterId],
    queryFn: () => fetchCharacter(characterId),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!character) throw new Error("Character not loaded");

      const ap = parseInt(adventurePoints) || 0;
      const atp = parseInt(attributePoints) || 0;

      if (ap === 0 && atp === 0) {
        throw new Error(t("eventNoChanges"));
      }

      const cp = character.characterSheet.calculationPoints;

      const result = await updateCalculationPoints(characterId, {
        ...(ap !== 0
          ? {
              adventurePoints: {
                total: { initialValue: cp.adventurePoints.total, increasedPoints: ap },
              },
            }
          : {}),
        ...(atp !== 0
          ? {
              attributePoints: {
                total: { initialValue: cp.attributePoints.total, increasedPoints: atp },
              },
            }
          : {}),
      });

      if (eventName.trim() && result.historyRecord) {
        await updateHistoryComment(characterId, result.historyRecord.id, eventName.trim());
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["character", characterId] });
      queryClient.invalidateQueries({ queryKey: ["history", characterId] });
      toast("success", t("eventSuccess"));
      resetAndClose();
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast("error", error.message);
      } else {
        toast("error", error.message || t("toastSaveError"));
      }
    },
  });

  function resetAndClose() {
    setEventName("");
    setAdventurePoints("");
    setAttributePoints("");
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={resetAndClose}
      title={t("eventTitle")}
      actions={
        <>
          <Button variant="secondary" onClick={resetAndClose} disabled={mutation.isPending}>
            {t("cancel")}
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending}>
            {t("eventApply")}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label={t("eventName")}
          placeholder={t("eventNamePlaceholder")}
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
        />
        <Input
          label={t("eventAdventurePoints")}
          type="number"
          placeholder={t("eventPointsHint")}
          value={adventurePoints}
          onChange={(e) => setAdventurePoints(e.target.value)}
        />
        <Input
          label={t("eventAttributePoints")}
          type="number"
          placeholder={t("eventPointsHint")}
          value={attributePoints}
          onChange={(e) => setAttributePoints(e.target.value)}
        />
      </div>
    </Dialog>
  );
}
