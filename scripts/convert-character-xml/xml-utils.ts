import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export const infoMessages = new Map<string, string[]>();

export function normalizeTagName(value: string): string {
  return value.replace(/u0020/g, " ").replace(/u0028/g, "(").replace(/u0029/g, ")").replace(/u002F/g, "/");
}

export function normalizeLabel(value: string): string {
  return normalizeTagName(value).replace(/\s+/g, " ").trim();
}

export function ensureArray<T>(value: T | T[] | null | undefined): T[] {
  if (value === null || value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

export function queueInfoBlock(title: string, lines: string[]): void {
  const existing = infoMessages.get(title) ?? [];
  infoMessages.set(title, existing.concat(lines));
}

export function flushInfoBlocks(): void {
  for (const [title, lines] of infoMessages) {
    console.info(["", `${title}:`, ...lines.map((line) => `  • ${line}`), ""].join("\n"));
  }
  infoMessages.clear();
}

export function asText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object" && "_" in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>)._ ?? "");
  }
  return String(value);
}

export function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function toInt(value: unknown, fallback = 0): number {
  const parsed = Number.parseInt(asText(value), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function toOptionalInt(value: unknown): number | null {
  const text = asText(value);
  if (!text) {
    return null;
  }
  const parsed = Number.parseInt(text, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function toIsoTimestamp(value: string): string {
  const normalized = normalizeLabel(value);
  const match = normalized.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) {
    return new Date().toISOString();
  }
  const [, day, month, year] = match;
  return `${year}-${month}-${day}T00:00:00Z`;
}

export function hashCharacterName(name: string): string {
  return crypto.createHash("sha256").update(normalizeLabel(name)).digest("hex");
}

export async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function findRepoRoot(startDir: string): Promise<string> {
  let currentDir = startDir;
  while (true) {
    const agentsPath = path.join(currentDir, "AGENTS.md");
    const packagePath = path.join(currentDir, "package.json");
    if ((await pathExists(agentsPath)) && (await pathExists(packagePath))) {
      return currentDir;
    }
    const parent = path.dirname(currentDir);
    if (parent === currentDir) {
      return startDir;
    }
    currentDir = parent;
  }
}
