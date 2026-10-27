"use client";

import { useState } from "react";
import { PBanner } from "@porsche-design-system/components-react/ssr";
import type { ProductDetailWarningBannerCopy } from "@/app/components/product/ProductDetailWarningBanner";

type Props = {
  copy: ProductDetailWarningBannerCopy;
  showBanner: boolean;
};

/**
 * Intentional WCAG 2.4.3 / 4.1.3 defects:
 * - Opens immediately during route load without waiting for route focus to settle
 * - Does not restore focus to the page heading when dismissed via keyboard
 * - Uses skipped `headingTag="h5"`
 */
export function ProductDetailWarningBanner({ copy, showBanner }: Props) {
  const [open, setOpen] = useState(showBanner);

  return (
    <PBanner
      description={open ? copy.description : ""}
      dismissButton
      heading={open ? copy.heading : ""}
      headingTag="h5"
      onDismiss={() => setOpen(false)}
      open={open}
      state="info"
    />
  );
}
