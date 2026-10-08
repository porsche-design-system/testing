"use client";

import { useEffect, useRef, useState } from "react";
import { PBanner } from "@porsche-design-system/components-react/ssr";
import type { Dictionary } from "@/app/i18n/get-dictionary";
import { isRouteFocusHolding } from "@/app/components/routing/route-focus-hold";
import { PAGE_HEADING_ID } from "@/app/lib/skip-to-page-heading";

export type ProductDetailWarningBannerCopy =
  Dictionary["pages"]["productDetail"]["infoBanner"];

/** Long enough for the page-load announcement to finish before the banner's status region updates. */
export const PRODUCT_DETAIL_BANNER_DELAY_MS = 200;

/** How often to check whether route focus has stopped moving focus to the heading. */
export const ROUTE_FOCUS_RELEASE_POLL_MS = 50;

type Props = {
  copy: ProductDetailWarningBannerCopy;
  showBanner: boolean;
};

function focusIsInsideBanner(): boolean {
  const banner = document.querySelector("p-banner");
  const active = document.activeElement;
  if (!banner || !active) return false;
  return active === banner || banner.contains(active);
}

function returnFocusToHeading(keyboard: boolean) {
  const active = document.activeElement;
  const focusAlreadyMoved =
    active instanceof HTMLElement &&
    active.id !== PAGE_HEADING_ID &&
    active !== document.body &&
    !focusIsInsideBanner();
  if (focusAlreadyMoved) return;

  const heading = document.getElementById(PAGE_HEADING_ID);
  if (!heading) return;
  if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
  if (document.activeElement !== heading) {
    heading.focus({ focusVisible: keyboard });
  }
}

export function ProductDetailWarningBanner({ copy, showBanner }: Props) {
  const [announced, setAnnounced] = useState(false);
  const wasOpen = useRef(false);
  const dismissWithKeyboard = useRef(false);

  useEffect(() => {
    if (!announced) return;
    dismissWithKeyboard.current = false;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Enter" || event.key === " ") {
        dismissWithKeyboard.current = true;
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      dismissWithKeyboard.current = false;
    };
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [announced]);

  useEffect(() => {
    if (announced) {
      wasOpen.current = true;
      return;
    }
    if (!wasOpen.current) return;
    wasOpen.current = false;
    const keyboard = dismissWithKeyboard.current;
    // p-banner focuses its close button while it closes. Move to the heading
    // after that, unless the user has already focused something else.
    returnFocusToHeading(keyboard);
    const frame = requestAnimationFrame(() => returnFocusToHeading(keyboard));
    return () => cancelAnimationFrame(frame);
  }, [announced]);

  useEffect(() => {
    if (!showBanner) return;
    let timeout = 0;
    const openWhenFocusIsQuiet = () => {
      // Route focus calls heading.focus() on every frame. A polite status update
      // during that hold is discarded, and it is not repeated once focus settles.
      if (isRouteFocusHolding()) {
        timeout = window.setTimeout(openWhenFocusIsQuiet, ROUTE_FOCUS_RELEASE_POLL_MS);
        return;
      }
      setAnnounced(true);
    };
    timeout = window.setTimeout(openWhenFocusIsQuiet, PRODUCT_DETAIL_BANNER_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [showBanner]);

  return (
    <PBanner
      description={announced ? copy.description : ""}
      dismissButton
      heading={announced ? copy.heading : ""}
      headingTag="h2"
      onDismiss={() => setAnnounced(false)}
      open={announced}
      state="info"
    />
  );
}
