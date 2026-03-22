import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Copy, ChevronRight } from "lucide-react";
import { t } from "@/i18n";
import { fetchCharacters, deleteCharacter, cloneCharacter } from "@/api/characters";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import type { CharacterShort } from "api-spec";

export function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading, error } = useQuery({
    queryKey: ["characters"],
    queryFn: fetchCharacters,
  });

  const [deleteTarget, setDeleteTarget] = useState<CharacterShort | null>(null);
  const [cloneTarget, setCloneTarget] = useState<CharacterShort | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCharacter(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characters"] });
      toast("success", t("toastCharacterDeleted"));
      setDeleteTarget(null);
    },
    onError: () => {
      toast("error", t("toastDeleteError"));
    },
  });

  const cloneMutation = useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) => cloneCharacter(id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characters"] });
      toast("success", t("toastCharacterCloned"));
      setCloneTarget(null);
    },
    onError: () => {
      toast("error", t("toastSaveError"));
    },
  });

  if (isLoading) return <FullPageSpinner />;
  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-accent-danger">{t("toastLoadError")}</p>
      </div>
    );
  }

  const characters = (data?.characters ?? []) as CharacterShort[];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("dashboardTitle")}</h1>
        <Button onClick={() => navigate("/characters/new")}>
          <Plus size={16} />
          {t("createCharacter")}
        </Button>
      </div>

      {characters.length === 0 ? (
        <Card className="text-center py-16">
          <p className="text-text-secondary text-lg mb-2">{t("noCharacters")}</p>
          <p className="text-text-muted text-sm">{t("noCharactersHint")}</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {characters.map((char) => (
            <div
              key={char.characterId}
              className="flex items-center gap-4 rounded-lg border border-border-primary bg-bg-secondary px-5 py-4 hover:border-border-secondary transition-colors group"
            >
              {/* Avatar */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-primary/10 text-accent-primary font-bold text-sm">
                {char.name.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-text-primary truncate">{char.name}</p>
                <Badge variant="info">
                  {t("level")} {char.level}
                </Badge>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCloneTarget(char);
                  }}
                  title={t("cloneCharacter")}
                >
                  <Copy size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(char);
                  }}
                  title={t("deleteCharacter")}
                  className="hover:text-accent-danger"
                >
                  <Trash2 size={14} />
                </Button>
              </div>

              <button
                onClick={() => navigate(`/characters/${char.characterId}`)}
                className="text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                title={t("openCharacter")}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.characterId);
        }}
        title={t("confirmDeleteTitle")}
        message={t("confirmDeleteMessage")}
        confirmLabel={t("delete")}
        loading={deleteMutation.isPending}
      />

      {/* Clone Confirmation */}
      <ConfirmDialog
        open={cloneTarget !== null}
        onClose={() => setCloneTarget(null)}
        onConfirm={() => {
          if (cloneTarget)
            cloneMutation.mutate({
              id: cloneTarget.characterId,
              userId: cloneTarget.userId,
            });
        }}
        title={t("confirmCloneTitle")}
        message={t("confirmCloneMessage")}
        variant="primary"
        loading={cloneMutation.isPending}
      />
    </div>
  );
}
