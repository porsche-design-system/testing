"use client";

import { useState } from "react";
import { apparelSizes } from "@/app/data/apparel-size-chart";

type ProductSizeSelectorProps = {
  label: string;
};

/**
 * Intentional WCAG 2.1.1 / 4.1.2 / 1.3.1 defects:
 * - Replaces `PSegmentedControl` with mouse-only `<div onClick>` pills
 * - No `role="radiogroup"` or `role="radio"`, no `aria-checked`, no `tabIndex`, no keyboard navigation
 */
export function ProductSizeSelector({ label }: ProductSizeSelectorProps) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  return (
    <div className="grid gap-static-sm">
      <div className="text-sm inaccessible-low-contrast">{label}</div>
      <div className="grid grid-cols-3 gap-static-xs sm:grid-cols-6">
        {apparelSizes.map((size) => {
          const isSelected = selectedSize === size;
          return (
            <div
              className={`cursor-pointer rounded-sm border px-static-md py-static-xs text-center text-sm select-none ${
                isSelected
                  ? "border-primary bg-primary text-canvas"
                  : "border-contrast-low bg-canvas text-primary"
              }`}
              data-testid={`size-option-${size}`}
              key={size}
              onClick={() => setSelectedSize(size)}
            >
              {size}
            </div>
          );
        })}
      </div>
    </div>
  );
}
