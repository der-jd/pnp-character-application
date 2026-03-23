import * as matchers from "@testing-library/jest-dom/matchers";
import { expect, vi } from "vitest";
import React from "react";

// Extend vitest's expect with jest-dom matchers
expect.extend(matchers);

// Mock lucide-react icons — jsdom cannot render SVG components from lucide.
// Use importOriginal so vitest knows all named exports exist, then replace each
// icon with a lightweight span element.
vi.mock("lucide-react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("lucide-react")>();
  const mocked: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(actual)) {
    if (typeof value === "function") {
      const iconName = name;
      mocked[name] = React.forwardRef<HTMLSpanElement, Record<string, unknown>>(function MockIcon(props, ref) {
        const { size: _size, strokeWidth: _sw, absoluteStrokeWidth: _asw, color: _c, ...rest } = props;
        return React.createElement("span", {
          ref,
          "data-testid": `icon-${iconName}`,
          "aria-hidden": "true",
          ...rest,
        });
      });
    } else {
      mocked[name] = value;
    }
  }
  return mocked;
});

// Mock HTMLDialogElement methods not available in jsdom
HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
  this.setAttribute("open", "");
});
HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
  this.removeAttribute("open");
});
