/**
 * Feature Flag Based Logger
 *
 * Can be controlled via NEXT_PUBLIC_DEBUG_ENABLED env variable
 * Allows granular control over different debug categories
 */

export type LogCategory = "auth" | "api" | "viewmodel" | "usecase" | "service" | "ui" | "all";

interface LoggerConfig {
  enabled: boolean;
  categories: Set<LogCategory>;
}

class FeatureFlagLogger {
  private config: LoggerConfig;

  constructor() {
    const debugEnabled = process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_DEBUG_ENABLED === "true";

    const categories = this.parseCategories(process.env.NEXT_PUBLIC_DEBUG_CATEGORIES || "all");

    this.config = {
      enabled: debugEnabled,
      categories,
    };
  }

  /**
   * Parse debug categories from env variable
   * Example: NEXT_PUBLIC_DEBUG_CATEGORIES="auth,api,viewmodel"
   */
  private parseCategories(categoriesString: string): Set<LogCategory> {
    const cats = categoriesString.split(",").map((c) => c.trim());
    if (cats.includes("all")) {
      return new Set<LogCategory>(["all"]);
    }
    return new Set(cats.filter((c) => this.isValidCategory(c)) as LogCategory[]);
  }

  private isValidCategory(cat: string): cat is LogCategory {
    return ["auth", "api", "viewmodel", "usecase", "service", "ui", "all"].includes(cat);
  }

  /**
   * Check if a category is enabled
   */
  private isCategoryEnabled(category: LogCategory): boolean {
    return this.config.enabled && (this.config.categories.has("all") || this.config.categories.has(category));
  }

  /**
   * Debug log with category
   */
  debug(category: LogCategory, scope: string, message: string, ...args: unknown[]): void {
    if (this.isCategoryEnabled(category)) {
      console.log(`[${category.toUpperCase()}][${scope}] ${message}`, ...args);
    }
  }

  /**
   * Info log with category
   */
  info(category: LogCategory, scope: string, message: string, ...args: unknown[]): void {
    if (this.isCategoryEnabled(category)) {
      console.info(`[${category.toUpperCase()}][${scope}] ${message}`, ...args);
    }
  }

  /**
   * Warning - always shows
   */
  warn(scope: string, message: string, ...args: unknown[]): void {
    console.warn(`[WARN][${scope}] ${message}`, ...args);
  }

  /**
   * Error - always shows
   */
  error(scope: string, message: string, ...args: unknown[]): void {
    console.error(`[ERROR][${scope}] ${message}`, ...args);
  }

  /**
   * Performance timing
   */
  time(category: LogCategory, label: string): void {
    if (this.isCategoryEnabled(category)) {
      console.time(label);
    }
  }

  timeEnd(category: LogCategory, label: string): void {
    if (this.isCategoryEnabled(category)) {
      console.timeEnd(label);
    }
  }

  /**
   * Trace - shows call stack
   */
  trace(category: LogCategory, scope: string, message: string): void {
    if (this.isCategoryEnabled(category)) {
      console.trace(`[${category.toUpperCase()}][${scope}] ${message}`);
    }
  }
}

export const featureLogger = new FeatureFlagLogger();
