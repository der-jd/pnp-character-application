import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback, useEffect, useRef } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { MessageSquare, Undo2, ChevronRight, ChevronDown, Loader2 } from "lucide-react";
import { HistoryRecordType, type HistoryRecord, type HistoryBlock } from "api-spec";
import { t } from "@/i18n";
import { fetchHistory, updateHistoryComment, revertHistoryRecord } from "@/api/history";
import { ApiError } from "@/api/client";
import { historyRecordTypeKeys } from "@/i18n/mappings";
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

  const [additionalBlocks, setAdditionalBlocks] = useState<HistoryBlock[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setAdditionalBlocks([]);
    setLoadingMore(false);
    setExpandedIds(new Set());
  }, [characterId]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["history", characterId],
    queryFn: async () => {
      return await fetchHistory(characterId!);
    },
    enabled: !!characterId,
    staleTime: 0,
  });

  const initialBlocks = data?.items ?? [];
  const previousBlockNumber = data?.previousBlockNumber ?? null;

  // Auto-load remaining blocks in the background
  const loadingRef = useRef(false);
  const lastCharacterIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (characterId !== lastCharacterIdRef.current) {
      lastCharacterIdRef.current = characterId;
      loadingRef.current = false;
    }
  }, [characterId]);

  useEffect(() => {
    if (previousBlockNumber === null || loadingRef.current || !data) return;

    let cancelled = false;
    loadingRef.current = true;
    setLoadingMore(true);

    async function loadRemaining(blockNum: number) {
      const blocks: HistoryBlock[] = [];
      let nextBlock: number | null = blockNum;
      while (nextBlock !== null && !cancelled) {
        try {
          const res = await fetchHistory(characterId!, nextBlock);
          if (cancelled) return;
          blocks.push(...res.items);
          nextBlock = res.previousBlockNumber ?? null;
        } catch {
          if (!cancelled) toast("error", t("toastLoadError"));
          break;
        }
      }
      if (!cancelled) {
        setAdditionalBlocks(blocks);
        setLoadingMore(false);
        loadingRef.current = false;
      }
    }

    loadRemaining(previousBlockNumber);
    return () => {
      cancelled = true;
      loadingRef.current = false;
    };
  }, [previousBlockNumber, data, characterId, toast]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

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

  if (isLoading || (isFetching && initialBlocks.length === 0)) return <FullPageSpinner />;

  // Flatten blocks and reverse within each block to show most recent first
  const allBlocks = [...initialBlocks, ...additionalBlocks];
  const allRecords = allBlocks.flatMap(
    (block) => block.changes.map((record) => ({ ...record, blockNumber: block.blockNumber })).reverse(), // Reverse changes within each block (oldest first → newest first)
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("historyTitle")}</h1>

      {allRecords.length === 0 && !loadingMore ? (
        <div className="rounded-lg border border-border-primary bg-bg-secondary">
          <p className="text-text-muted text-center py-8">{t("historyEmpty")}</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border-primary overflow-hidden">
          {/* Header */}
          <div className="hidden sm:grid sm:grid-cols-[2rem_4rem_minmax(6rem,1fr)_minmax(6rem,1.5fr)_minmax(5rem,8rem)_minmax(4rem,1fr)_4.5rem] gap-2 px-4 py-2 bg-bg-tertiary border-b border-border-primary text-xs font-semibold text-text-muted uppercase tracking-wider">
            <span />
            <span>{t("historyColumnNumber")}</span>
            <span>{t("historyColumnType")}</span>
            <span>{t("historyColumnName")}</span>
            <span>{t("historyColumnTimestamp")}</span>
            <span>{t("historyColumnComment")}</span>
            <span>{t("historyColumnActions")}</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-border-primary">
            {allRecords.map((record) => {
              const isExpanded = expandedIds.has(record.id);
              return (
                <div key={record.id} className="bg-bg-secondary">
                  {/* Main row */}
                  <div
                    className="grid grid-cols-[2rem_1fr_4.5rem] sm:grid-cols-[2rem_4rem_minmax(6rem,1fr)_minmax(6rem,1.5fr)_minmax(5rem,8rem)_minmax(4rem,1fr)_4.5rem] gap-2 px-4 py-2.5 items-center cursor-pointer hover:bg-bg-hover transition-colors"
                    onClick={() => toggleExpand(record.id)}
                  >
                    {/* Expand chevron */}
                    <span className="text-text-muted">
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </span>

                    {/* Number */}
                    <span className="hidden sm:block text-xs text-text-muted font-mono">{record.number}</span>

                    {/* Type badge */}
                    <span>
                      <Badge variant={TYPE_BADGE_VARIANTS[record.type] ?? "default"}>
                        {t(historyRecordTypeKeys[record.type]!)}
                      </Badge>
                    </span>

                    {/* Name */}
                    <span className="hidden sm:block text-sm text-text-primary truncate">{record.name || "—"}</span>

                    {/* Timestamp */}
                    <span className="hidden sm:block text-xs text-text-muted whitespace-nowrap">
                      {formatTimestamp(record.timestamp)}
                    </span>

                    {/* Comment preview */}
                    <span
                      className="hidden sm:block text-xs text-text-secondary truncate italic"
                      title={record.comment ?? undefined}
                    >
                      {record.comment || "—"}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
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

                  {/* Mobile: show name + timestamp below on small screens */}
                  {!isExpanded && (
                    <div className="sm:hidden px-4 pb-2 -mt-1 flex items-center gap-2 text-xs text-text-muted">
                      <span className="font-mono">#{record.number}</span>
                      <span className="truncate">{record.name}</span>
                      <span className="ml-auto whitespace-nowrap">{formatTimestamp(record.timestamp)}</span>
                    </div>
                  )}

                  {/* Expanded detail: tree view */}
                  {isExpanded && (
                    <div className="px-4 pb-3 sm:pl-14">
                      {/* Mobile extras */}
                      <div className="sm:hidden mb-2 text-xs text-text-muted space-y-0.5">
                        <div>
                          <span className="font-mono">#{record.number}</span> · {record.name} ·{" "}
                          {formatTimestamp(record.timestamp)}
                        </div>
                      </div>

                      {record.comment && (
                        <div className="mb-3 rounded-md border border-border-primary bg-bg-tertiary px-3 py-2">
                          <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-text-muted">
                            {t("historyComment")}
                          </div>
                          <p className="text-sm text-text-primary whitespace-pre-wrap break-words italic">
                            {record.comment}
                          </p>
                        </div>
                      )}

                      <div className="text-xs space-y-1.5">
                        {record.learningMethod && <TreeRow label={t("learningMethod")} value={record.learningMethod} />}
                        {record.calculationPoints.adventurePoints && (
                          <TreeNode label={t("adventurePoints")}>
                            <TreeRow
                              label={t("oldValue")}
                              value={JSON.stringify(record.calculationPoints.adventurePoints.old)}
                            />
                            <TreeRow
                              label={t("newValue")}
                              value={JSON.stringify(record.calculationPoints.adventurePoints.new)}
                            />
                          </TreeNode>
                        )}
                        {record.calculationPoints.attributePoints && (
                          <TreeNode label={t("attributePoints")}>
                            <TreeRow
                              label={t("oldValue")}
                              value={JSON.stringify(record.calculationPoints.attributePoints.old)}
                            />
                            <TreeRow
                              label={t("newValue")}
                              value={JSON.stringify(record.calculationPoints.attributePoints.new)}
                            />
                          </TreeNode>
                        )}
                        {record.data.old && (
                          <TreeNode label={t("oldValue")}>
                            <JsonTree data={record.data.old} />
                          </TreeNode>
                        )}
                        <TreeNode label={t("newValue")}>
                          <JsonTree data={record.data.new} />
                        </TreeNode>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Loading indicator */}
          {loadingMore && (
            <div className="flex items-center justify-center gap-2 py-3 border-t border-border-primary text-xs text-text-muted">
              <Loader2 size={14} className="animate-spin" />
              {t("historyLoadingMore")}
            </div>
          )}
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

function TreeNode({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-medium text-text-secondary">{label}</div>
      <div className="ml-4 border-l border-border-primary pl-3 mt-0.5 space-y-0.5">{children}</div>
    </div>
  );
}

function TreeRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-text-muted shrink-0">{label}:</span>
      <span className="text-text-primary break-all">{value}</span>
    </div>
  );
}

function JsonTree({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="space-y-0.5">
      {Object.entries(data).map(([key, value]) => {
        if (value !== null && typeof value === "object" && !Array.isArray(value)) {
          return (
            <TreeNode key={key} label={key}>
              <JsonTree data={value as Record<string, unknown>} />
            </TreeNode>
          );
        }
        if (Array.isArray(value)) {
          return (
            <TreeNode key={key} label={`${key} (${value.length})`}>
              {value.map((item, i) =>
                typeof item === "object" && item !== null ? (
                  <TreeNode key={i} label={`[${i}]`}>
                    <JsonTree data={item as Record<string, unknown>} />
                  </TreeNode>
                ) : (
                  <TreeRow key={i} label={`[${i}]`} value={String(item)} />
                ),
              )}
            </TreeNode>
          );
        }
        return <TreeRow key={key} label={key} value={String(value ?? "—")} />;
      })}
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
