import * as matchers from "@testing-library/jest-dom/matchers";
import { expect, vi } from "vitest";
import React from "react";

// Extend vitest's expect with jest-dom matchers
expect.extend(matchers);

// Mock lucide-react icons — jsdom cannot render SVG components from lucide
vi.mock("lucide-react", () => {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, name: string) {
      if (name === "__esModule") return true;
      if (name === "default") return {};
      // Return a forwardRef component for each icon name
      return React.forwardRef<HTMLSpanElement, Record<string, unknown>>(function MockIcon(props, ref) {
        const { size: _size, strokeWidth: _sw, absoluteStrokeWidth: _asw, color: _c, ...rest } = props;
        return React.createElement("span", {
          ref,
          "data-testid": `icon-${name}`,
          "aria-hidden": "true",
          ...rest,
        });
      });
    },
  };
  return new Proxy({}, handler);
});

// Mock HTMLDialogElement methods not available in jsdom
HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
  this.setAttribute("open", "");
});
HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
  this.removeAttribute("open");
});
