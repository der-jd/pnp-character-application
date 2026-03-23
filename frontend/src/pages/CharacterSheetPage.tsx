import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useEditableField } from "@/hooks/useEditableField";
import type { Character, Attribute, BaseValue } from "api-spec";
import { t } from "@/i18n";
import { fetchCharacter } from "@/api/characters";
import { updateAttribute, updateBaseValue, updateCalculationPoints, addSpecialAbility } from "@/api/character-edit";
import { ApiError } from "@/api/client";
import { attributeKeys, baseValueKeys, advantageNameKeys, disadvantageNameKeys } from "@/i18n/mappings";
import { attributeIcons } from "@/lib/skillIcons";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog } from "@/components/ui/Dialog";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { useToast } from "@/components/ui/Toast";

export function CharacterSheetPage() {
  const { characterId } = useParams<{ characterId: string }>();

  const {
    data: character,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["character", characterId],
    queryFn: () => fetchCharacter(characterId!),
    enabled: !!characterId,
  });

  if (isLoading) return <FullPageSpinner />;
  if (error || !character) return <ErrorState onRetry={() => refetch()} />;

  const sheet = character.characterSheet;
  const gi = sheet.generalInformation;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary font-bold text-2xl">
          {gi.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-bold">{gi.name}</h1>
            <span className="text-xs text-text-muted font-mono">{character.characterId}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="info">
              {t("level")} {gi.level}
            </Badge>
            <Badge>{gi.sex}</Badge>
            <Badge variant="default">
              {t("rulesetVersion")} {character.rulesetVersion}
            </Badge>
          </div>
        </div>
      </div>

      {/* General Information */}
      <Card title={t("generalInformation")}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <InfoField label={t("profession")} value={gi.profession.name} />
          <InfoField label={t("hobby")} value={gi.hobby.name} />
          <InfoField label={t("birthday")} value={gi.birthday} />
          <InfoField label={t("birthplace")} value={gi.birthplace} />
          <InfoField label={t("size")} value={gi.size} />
          <InfoField label={t("weight")} value={gi.weight} />
          <InfoField label={t("hairColor")} value={gi.hairColor} />
          <InfoField label={t("eyeColor")} value={gi.eyeColor} />
          <InfoField label={t("residence")} value={gi.residence} />
          {gi.appearance && (
            <div className="col-span-3">
              <InfoField label={t("appearance")} value={gi.appearance} />
            </div>
          )}
          {gi.specialCharacteristics && (
            <div className="col-span-3">
              <InfoField label={t("specialCharacteristics")} value={gi.specialCharacteristics} />
            </div>
          )}
        </div>
      </Card>

      {/* Calculation Points */}
      <CalculationPointsSection character={character} />

      {/* Advantages & Disadvantages */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title={t("advantages")}>
          {sheet.advantages.length === 0 ? (
            <p className="text-sm text-text-muted">—</p>
          ) : (
            <div className="space-y-2">
              {sheet.advantages.map((a, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>
                    {t(advantageNameKeys[a[0]]!)}
                    {a[1] ? ` (${a[1]})` : ""}
                  </span>
                  <Badge variant="warning">{a[2]}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card title={t("disadvantages")}>
          {sheet.disadvantages.length === 0 ? (
            <p className="text-sm text-text-muted">—</p>
          ) : (
            <div className="space-y-2">
              {sheet.disadvantages.map((d, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>
                    {t(disadvantageNameKeys[d[0]]!)}
                    {d[1] ? ` (${d[1]})` : ""}
                  </span>
                  <Badge variant="danger">{d[2]}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Special Abilities */}
      <SpecialAbilitiesSection characterId={characterId!} specialAbilities={sheet.specialAbilities} />

      {/* Attributes */}
      <AttributesSection characterId={characterId!} attributes={sheet.attributes} />

      {/* Base Values */}
      <BaseValuesSection characterId={characterId!} baseValues={sheet.baseValues} />
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-text-muted text-xs">{label}</p>
      <p className="text-text-primary">{value || "—"}</p>
    </div>
  );
}

function CalculationPointsSection({ character }: { character: Character }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const cp = character.characterSheet.calculationPoints;

  const [editing, setEditing] = useState(false);
  const [apStart, setApStart] = useState(cp.adventurePoints.start);
  const [atpStart, setAtpStart] = useState(cp.attributePoints.start);

  const mutation = useMutation({
    mutationFn: () =>
      updateCalculationPoints(character.characterId, {
        adventurePoints: {
          start: { initialValue: cp.adventurePoints.start, newValue: apStart },
        },
        attributePoints: {
          start: { initialValue: cp.attributePoints.start, newValue: atpStart },
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["character", character.characterId] });
      toast("success", t("toastSaveSuccess"));
      setEditing(false);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast("error", error.message);
      } else {
        toast("error", t("toastSaveError"));
      }
    },
  });

  return (
    <Card
      title={t("calculationPoints")}
      actions={
        editing ? (
          <>
            <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>
              {t("cancel")}
            </Button>
            <Button size="sm" onClick={() => mutation.mutate()} loading={mutation.isPending}>
              {t("save")}
            </Button>
          </>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            {t("edit")}
          </Button>
        )
      }
    >
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h4 className="text-xs font-semibold text-text-muted mb-2">{t("adventurePoints")}</h4>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="text-center">
              <p className="text-xs text-text-muted">{t("start")}</p>
              {editing ? (
                <input
                  type="number"
                  value={apStart}
                  onChange={(e) => setApStart(Number(e.target.value))}
                  className="w-full rounded border border-border-primary bg-bg-tertiary px-2 py-1 text-center text-sm font-mono"
                />
              ) : (
                <p className="font-mono font-bold">{cp.adventurePoints.start}</p>
              )}
            </div>
            <div className="text-center">
              <p className="text-xs text-text-muted">{t("available")}</p>
              <p className="font-mono font-bold">{cp.adventurePoints.available}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-text-muted">{t("total")}</p>
              <p className="font-mono font-bold">{cp.adventurePoints.total}</p>
            </div>
          </div>
        </div>
        <div>
          <h4 className="text-xs font-semibold text-text-muted mb-2">{t("attributePoints")}</h4>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="text-center">
              <p className="text-xs text-text-muted">{t("start")}</p>
              {editing ? (
                <input
                  type="number"
                  value={atpStart}
                  onChange={(e) => setAtpStart(Number(e.target.value))}
                  className="w-full rounded border border-border-primary bg-bg-tertiary px-2 py-1 text-center text-sm font-mono"
                />
              ) : (
                <p className="font-mono font-bold">{cp.attributePoints.start}</p>
              )}
            </div>
            <div className="text-center">
              <p className="text-xs text-text-muted">{t("available")}</p>
              <p className="font-mono font-bold">{cp.attributePoints.available}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-text-muted">{t("total")}</p>
              <p className="font-mono font-bold">{cp.attributePoints.total}</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function SpecialAbilitiesSection({
  characterId,
  specialAbilities,
}: {
  characterId: string;
  specialAbilities: string[];
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newAbility, setNewAbility] = useState("");

  const mutation = useMutation({
    mutationFn: () => addSpecialAbility(characterId, newAbility),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["character", characterId] });
      toast("success", t("toastSpecialAbilityAdded"));
      setDialogOpen(false);
      setNewAbility("");
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast("error", error.message);
      } else {
        toast("error", t("toastSaveError"));
      }
    },
  });

  return (
    <Card
      title={t("specialAbilities")}
      actions={
        <Button variant="ghost" size="sm" onClick={() => setDialogOpen(true)}>
          <Plus size={14} /> {t("add")}
        </Button>
      }
    >
      {specialAbilities.length === 0 ? (
        <p className="text-sm text-text-muted">—</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {specialAbilities.map((sa, i) => (
            <Badge key={i}>{sa}</Badge>
          ))}
        </div>
      )}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={t("addSpecialAbility")}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!newAbility.trim()}>
              {t("add")}
            </Button>
          </>
        }
      >
        <Input
          label={t("specialAbilities")}
          value={newAbility}
          onChange={(e) => setNewAbility(e.target.value)}
          autoFocus
        />
      </Dialog>
    </Card>
  );
}

function AttributesSection({
  characterId,
  attributes,
}: {
  characterId: string;
  attributes: Record<string, Attribute>;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { editing, editValues, setEditValues, startEdit, cancelEdit } = useEditableField({
    start: 0,
    current: 0,
    mod: 0,
  });

  const mutation = useMutation({
    mutationFn: ({
      name,
      data,
    }: {
      name: string;
      data: {
        start?: { initialValue: number; newValue: number };
        current?: { initialValue: number; increasedPoints: number };
        mod?: { initialValue: number; newValue: number };
      };
    }) => updateAttribute(characterId, name, data),
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

  function handleStartEdit(name: string, attr: Attribute) {
    startEdit(name, { start: attr.start, current: attr.current, mod: attr.mod });
  }

  function saveEdit(name: string, attr: Attribute) {
    const data: Parameters<typeof updateAttribute>[2] = {};
    if (editValues.start !== attr.start) data.start = { initialValue: attr.start, newValue: editValues.start };
    if (editValues.current !== attr.current)
      data.current = { initialValue: attr.current, increasedPoints: editValues.current - attr.current };
    if (editValues.mod !== attr.mod) data.mod = { initialValue: attr.mod, newValue: editValues.mod };
    if (Object.keys(data).length === 0) {
      cancelEdit();
      return;
    }
    mutation.mutate({ name, data });
  }

  return (
    <Card title={t("attributes")}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-primary text-text-muted text-xs">
              <th className="py-2 w-6"></th>
              <th className="text-left py-2 pr-4 font-medium">{t("attributes")}</th>
              <th className="text-center py-2 px-2 font-medium">{t("start")}</th>
              <th className="text-center py-2 px-2 font-medium">{t("current")}</th>
              <th className="text-center py-2 px-2 font-medium">{t("mod")}</th>
              <th className="text-center py-2 px-2 font-medium">{t("totalCostAttributePoints")}</th>
              <th className="py-2 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(attributes).map(([name, attr]) => (
              <tr key={name} className="border-b border-border-primary/50 hover:bg-bg-hover/30">
                <td className="py-2 text-accent-primary">{attributeIcons[name]}</td>
                <td className="py-2 pr-4 font-medium">{t(attributeKeys[name]!)}</td>
                <td className="text-center py-2 px-2">
                  {editing === name ? (
                    <input
                      type="number"
                      value={editValues.start}
                      onChange={(e) => setEditValues((v) => ({ ...v, start: Number(e.target.value) }))}
                      className="w-14 rounded border border-border-primary bg-bg-tertiary px-1 py-0.5 text-center text-sm font-mono"
                    />
                  ) : (
                    <span className="font-mono">{attr.start}</span>
                  )}
                </td>
                <td className="text-center py-2 px-2">
                  {editing === name ? (
                    <input
                      type="number"
                      value={editValues.current}
                      onChange={(e) => setEditValues((v) => ({ ...v, current: Number(e.target.value) }))}
                      className="w-14 rounded border border-border-primary bg-bg-tertiary px-1 py-0.5 text-center text-sm font-mono"
                    />
                  ) : (
                    <span className="font-mono">{attr.current}</span>
                  )}
                </td>
                <td className="text-center py-2 px-2">
                  {editing === name ? (
                    <input
                      type="number"
                      value={editValues.mod}
                      onChange={(e) => setEditValues((v) => ({ ...v, mod: Number(e.target.value) }))}
                      className="w-14 rounded border border-border-primary bg-bg-tertiary px-1 py-0.5 text-center text-sm font-mono"
                    />
                  ) : (
                    <span className="font-mono">{attr.mod}</span>
                  )}
                </td>
                <td className="text-center py-2 px-2 font-mono text-text-muted">{attr.totalCost}</td>
                <td className="py-2 text-right">
                  {editing === name ? (
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="sm" onClick={cancelEdit}>
                        {t("cancel")}
                      </Button>
                      <Button size="sm" onClick={() => saveEdit(name, attr)} loading={mutation.isPending}>
                        {t("save")}
                      </Button>
                    </div>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => handleStartEdit(name, attr)}>
                      {t("edit")}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function BaseValuesSection({
  characterId,
  baseValues,
}: {
  characterId: string;
  baseValues: Record<string, BaseValue>;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { editing, editValues, setEditValues, startEdit, cancelEdit } = useEditableField({ start: 0, mod: 0 });

  const mutation = useMutation({
    mutationFn: ({
      name,
      data,
    }: {
      name: string;
      data: { start?: { initialValue: number; newValue: number }; mod?: { initialValue: number; newValue: number } };
    }) => updateBaseValue(characterId, name, data),
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

  function handleStartEdit(name: string, bv: BaseValue) {
    startEdit(name, { start: bv.start, mod: bv.mod });
  }

  function saveEdit(name: string, bv: BaseValue) {
    const data: Parameters<typeof updateBaseValue>[2] = {};
    if (editValues.start !== bv.start) data.start = { initialValue: bv.start, newValue: editValues.start };
    if (editValues.mod !== bv.mod) data.mod = { initialValue: bv.mod, newValue: editValues.mod };
    if (Object.keys(data).length === 0) {
      cancelEdit();
      return;
    }
    mutation.mutate({ name, data });
  }

  return (
    <Card title={t("baseValues")}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-primary text-text-muted text-xs">
              <th className="text-left py-2 pr-4 font-medium">{t("baseValues")}</th>
              <th className="text-center py-2 px-2 font-medium">{t("start")}</th>
              <th className="text-center py-2 px-2 font-medium">{t("byFormula")}</th>
              <th className="text-center py-2 px-2 font-medium">{t("byLvlUp")}</th>
              <th className="text-center py-2 px-2 font-medium">{t("current")}</th>
              <th className="text-center py-2 px-2 font-medium">{t("mod")}</th>
              <th className="py-2 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(baseValues).map(([name, bv]) => (
              <tr key={name} className="border-b border-border-primary/50 hover:bg-bg-hover/30">
                <td className="py-2 pr-4 font-medium">{t(baseValueKeys[name]!)}</td>
                <td className="text-center py-2 px-2">
                  {editing === name ? (
                    <input
                      type="number"
                      value={editValues.start}
                      onChange={(e) => setEditValues((v) => ({ ...v, start: Number(e.target.value) }))}
                      className="w-14 rounded border border-border-primary bg-bg-tertiary px-1 py-0.5 text-center text-sm font-mono"
                    />
                  ) : (
                    <span className="font-mono">{bv.start}</span>
                  )}
                </td>
                <td className="text-center py-2 px-2 font-mono text-text-muted">{bv.byFormula ?? "—"}</td>
                <td className="text-center py-2 px-2 font-mono text-text-muted">{bv.byLvlUp ?? "—"}</td>
                <td className="text-center py-2 px-2 font-mono">{bv.current}</td>
                <td className="text-center py-2 px-2">
                  {editing === name ? (
                    <input
                      type="number"
                      value={editValues.mod}
                      onChange={(e) => setEditValues((v) => ({ ...v, mod: Number(e.target.value) }))}
                      className="w-14 rounded border border-border-primary bg-bg-tertiary px-1 py-0.5 text-center text-sm font-mono"
                    />
                  ) : (
                    <span className="font-mono">{bv.mod}</span>
                  )}
                </td>
                <td className="py-2 text-right">
                  {editing === name ? (
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="sm" onClick={cancelEdit}>
                        {t("cancel")}
                      </Button>
                      <Button size="sm" onClick={() => saveEdit(name, bv)} loading={mutation.isPending}>
                        {t("save")}
                      </Button>
                    </div>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => handleStartEdit(name, bv)}>
                      {t("edit")}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
