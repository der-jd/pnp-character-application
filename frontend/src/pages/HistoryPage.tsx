import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { MessageSquare, Undo2 } from "lucide-react";
import { HistoryRecordType, type HistoryRecord, type HistoryBlock } from "api-spec";
import { t } from "@/i18n";
import { fetchHistory, updateHistoryComment, revertHistoryRecord } from "@/api/history";
import { ApiError } from "@/api/client";
import { historyRecordTypeKeys } from "@/i18n/mappings";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";

const TYPE_BADGE_VARIANTS: Record<number, "default" | "success" | "info" | "warning" | "danger"> = {
  [HistoryRecordType.CHARACTER_CREATED]: "success",
  [HistoryRecordType.LEVEL_UP_APPLIED]: "info",
  [HistoryRecordType.CALCULATION_POINTS_CHANGED]: "warning",
  [HistoryRecordType.ATTRIBUTE_CHANGED]: "default",
  [HistoryRecordType.SKILL_CHANGED]: "default",
  [HistoryRecordType.BASE_VALUE_CHANGED]: "default",
  [HistoryRecordType.COMBAT_STATS_CHANGED]: "default",
  [HistoryRecordType.SPECIAL_ABILITIES_CHANGED]: "info",
  [HistoryRecordType.RULESET_VERSION_UPDATED]: "warning",
};

export function HistoryPage() {
  const { characterId } = useParams<{ characterId: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [blocks, setBlocks] = useState<HistoryBlock[]>([]);
  const [previousBlockNumber, setPreviousBlockNumber] = useState<number | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);

  const { isLoading } = useQuery({
    queryKey: ["history", characterId],
    queryFn: async () => {
      const res = await fetchHistory(characterId!);
      setBlocks(res.items);
      setPreviousBlockNumber(res.previousBlockNumber ?? null);
      setInitialLoad(false);
      return res;
    },
    enabled: !!characterId,
  });

  const [loadingMore, setLoadingMore] = useState(false);

  const loadMore = useCallback(async () => {
    if (previousBlockNumber === null) return;
    setLoadingMore(true);
    try {
      const res = await fetchHistory(characterId!, previousBlockNumber);
      setBlocks((prev) => [...prev, ...res.items]);
      setPreviousBlockNumber(res.previousBlockNumber ?? null);
    } catch {
      toast("error", t("toastLoadError"));
    } finally {
      setLoadingMore(false);
    }
  }, [characterId, previousBlockNumber, toast]);

  const [revertTarget, setRevertTarget] = useState<HistoryRecord | null>(null);
  const [commentTarget, setCommentTarget] = useState<{ record: HistoryRecord; blockNumber: number } | null>(null);
  const [commentText, setCommentText] = useState("");

  const revertMutation = useMutation({
    mutationFn: (recordId: string) => revertHistoryRecord(characterId!, recordId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["history", characterId] });
      queryClient.invalidateQueries({ queryKey: ["character", characterId] });
      toast("success", t("toastHistoryReverted"));
      setRevertTarget(null);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast("error", error.message);
      } else {
        toast("error", t("toastSaveError"));
      }
    },
  });

  const commentMutation = useMutation({
    mutationFn: ({ recordId, blockNumber }: { recordId: string; blockNumber: number }) =>
      updateHistoryComment(characterId!, recordId, commentText, blockNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["history", characterId] });
      toast("success", t("toastCommentSaved"));
      setCommentTarget(null);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast("error", error.message);
      } else {
        toast("error", t("toastSaveError"));
      }
    },
  });

  if (isLoading && initialLoad) return <FullPageSpinner />;

  const allRecords = blocks.flatMap((block) =>
    block.changes.map((record) => ({ ...record, blockNumber: block.blockNumber })),
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("historyTitle")}</h1>

      {allRecords.length === 0 ? (
        <Card>
          <p className="text-text-muted text-center py-8">{t("historyEmpty")}</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {allRecords.map((record) => (
            <div key={record.id} className="rounded-lg border border-border-primary bg-bg-secondary px-4 py-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant={TYPE_BADGE_VARIANTS[record.type] ?? "default"}>
                      {t(historyRecordTypeKeys[record.type]!)}
                    </Badge>
                    {record.name && <span className="text-sm font-medium text-text-primary">{record.name}</span>}
                    {record.learningMethod && <Badge variant="default">{record.learningMethod}</Badge>}
                  </div>

                  {/* Data changes */}
                  <div className="text-xs text-text-muted mt-1 space-y-0.5">
                    {record.data.old && (
                      <div className="flex gap-4">
                        <span className="text-accent-danger">
                          {t("oldValue")}: {JSON.stringify(record.data.old)}
                        </span>
                      </div>
                    )}
                    <div className="flex gap-4">
                      <span className="text-accent-success">
                        {t("newValue")}: {JSON.stringify(record.data.new)}
                      </span>
                    </div>
                  </div>

                  {/* Comment */}
                  {record.comment && <p className="text-xs text-text-secondary mt-1 italic">💬 {record.comment}</p>}

                  {/* Timestamp */}
                  <p className="text-[10px] text-text-muted mt-1">{formatTimestamp(record.timestamp)}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCommentTarget({ record, blockNumber: record.blockNumber });
                      setCommentText(record.comment ?? "");
                    }}
                    title={t("historyAddComment")}
                  >
                    <MessageSquare size={14} />
                  </Button>
                  {record.type !== HistoryRecordType.CHARACTER_CREATED && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRevertTarget(record)}
                      title={t("historyRevert")}
                      className="hover:text-accent-danger"
                    >
                      <Undo2 size={14} />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {previousBlockNumber !== null && (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={loadMore} loading={loadingMore}>
            {t("historyLoadMore")}
          </Button>
        </div>
      )}

      {/* Revert Confirmation */}
      <ConfirmDialog
        open={revertTarget !== null}
        onClose={() => setRevertTarget(null)}
        onConfirm={() => {
          if (revertTarget) revertMutation.mutate(revertTarget.id);
        }}
        title={t("historyRevert")}
        message={t("historyRevertConfirm")}
        loading={revertMutation.isPending}
      />

      {/* Comment Dialog */}
      {commentTarget && (
        <Dialog
          open
          onClose={() => setCommentTarget(null)}
          title={t("historyEditComment")}
          actions={
            <>
              <Button variant="secondary" onClick={() => setCommentTarget(null)}>
                {t("cancel")}
              </Button>
              <Button
                onClick={() =>
                  commentMutation.mutate({ recordId: commentTarget.record.id, blockNumber: commentTarget.blockNumber })
                }
                loading={commentMutation.isPending}
              >
                {t("historySaveComment")}
              </Button>
            </>
          }
        >
          <textarea
            className="w-full rounded-md border border-border-primary bg-bg-tertiary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-border-focus min-h-[100px]"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            autoFocus
          />
        </Dialog>
      )}
    </div>
  );
}

function formatTimestamp(ts: string): string {
  try {
    return format(new Date(ts), "dd.MM.yyyy HH:mm", { locale: de });
  } catch {
    return ts;
  }
}
