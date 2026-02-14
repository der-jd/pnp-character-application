import type { Record as HistoryRecord } from "api-spec";
import { RecordType } from "api-spec";

/**
 * View model for a history record entry
 * Presents history data in a format optimized for UI display
 */
export interface HistoryEntryViewModel {
  readonly id: string;
  readonly number: number;
  readonly type: RecordType;
  readonly typeName: string;
  readonly name: string;
  readonly displayName: string;
  readonly timestamp: Date;
  readonly formattedTimestamp: string;
  readonly learningMethod: string | null;
  readonly adventurePointsChange: number | null;
  readonly attributePointsChange: number | null;
  readonly comment: string | null;
  readonly oldValue: string;
  readonly newValue: string;
  readonly canRevert: boolean;
}

/**
 * Collection class for managing character history with business logic
 */
export class HistoryCollection {
  constructor(private records: HistoryRecord[]) {}

  /**
   * Gets all history entries as view models, sorted by timestamp (newest first)
   */
  getAllEntries(): HistoryEntryViewModel[] {
    return this.records
      .map((record) => this.createHistoryEntryViewModel(record))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Gets entries filtered by type
   */
  getByType(type: RecordType): HistoryEntryViewModel[] {
    return this.getAllEntries().filter((entry) => entry.type === type);
  }

  /**
   * Gets reversible entries (those that can be reverted)
   */
  getReversibleEntries(): HistoryEntryViewModel[] {
    return this.getAllEntries().filter((entry) => entry.canRevert);
  }

  private createHistoryEntryViewModel(record: HistoryRecord): HistoryEntryViewModel {
    const timestamp = new Date(record.timestamp);

    return {
      id: record.id,
      number: record.number,
      type: record.type,
      typeName: this.formatRecordType(record.type),
      name: record.name,
      displayName: this.formatName(record.name),
      timestamp,
      formattedTimestamp: this.formatTimestamp(timestamp),
      learningMethod: record.learningMethod,
      adventurePointsChange: record.calculationPoints.adventurePoints?.new.available ?? null,
      attributePointsChange: record.calculationPoints.attributePoints?.new.available ?? null,
      comment: record.comment,
      oldValue: this.formatValue(record.data.old),
      newValue: this.formatValue(record.data.new),
      canRevert: this.isReversible(record),
    };
  }

  private formatRecordType(type: RecordType): string {
    const typeNames: { [key in RecordType]: string } = {
      [RecordType.CHARACTER_CREATED]: "Character Created",
      [RecordType.LEVEL_CHANGED]: "Level Up",
      [RecordType.CALCULATION_POINTS_CHANGED]: "Points Changed",
      [RecordType.BASE_VALUE_CHANGED]: "Base Value",
      [RecordType.SPECIAL_ABILITIES_CHANGED]: "Special Ability",
      [RecordType.ATTRIBUTE_CHANGED]: "Attribute",
      [RecordType.SKILL_CHANGED]: "Skill",
      [RecordType.COMBAT_STATS_CHANGED]: "Combat Stats",
    };
    return typeNames[type] || "Unknown";
  }

  private formatName(name: string): string {
    // Convert camelCase to readable format
    return name
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  private formatTimestamp(date: Date): string {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  private formatValue(value: { [key: string]: unknown } | undefined): string {
    if (!value) return "N/A";

    // Try to extract a meaningful value
    if ("current" in value) return String(value.current);
    if ("value" in value) return String(value.value);

    // For complex objects, show a summary
    const keys = Object.keys(value);
    if (keys.length === 0) return "N/A";
    if (keys.length === 1) return String(value[keys[0]]);

    return `${keys.length} properties`;
  }

  private isReversible(record: HistoryRecord): boolean {
    // Only certain types can be reversed
    const reversibleTypes = [
      RecordType.SKILL_CHANGED,
      RecordType.ATTRIBUTE_CHANGED,
      RecordType.BASE_VALUE_CHANGED,
      RecordType.COMBAT_STATS_CHANGED,
    ];
    return reversibleTypes.includes(record.type);
  }
}
