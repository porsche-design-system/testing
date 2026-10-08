"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { PAGE_HEADING_ID } from "@/app/lib/skip-to-page-heading";

const ROUTE_FOCUS_KEY = "pds-ui-testing:route-focus";

/**
 * Moves focus to the page heading after an in-app route change.
 * A fresh visit, refresh, or back/forward restoration leaves focus where the browser put it.
 * The PDS focus ring is shown only when that route change was started from the keyboard.
 */
function rememberPending(modality: "keyboard" | "pointer") {
  try {
    sessionStorage.setItem(ROUTE_FOCUS_KEY, modality);
  } catch {
    // sessionStorage can throw in private mode. Focus still moves; the ring stays hidden.
  }
}

function consumePending(): "keyboard" | "pointer" | null {
  try {
    const modality = sessionStorage.getItem(ROUTE_FOCUS_KEY);
    sessionStorage.removeItem(ROUTE_FOCUS_KEY);
    return modality === "keyboard" || modality === "pointer" ? modality : null;
  } catch {
    return null;
  }
}

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

function inAppRouteAnchor(event: Event): HTMLAnchorElement | null {
  for (const node of event.composedPath()) {
    if (!(node instanceof HTMLAnchorElement)) continue;
    if (node.target && node.target !== "_self") continue;
    let url: URL;
    try {
      url = new URL(node.href, window.location.href);
    } catch {
      continue;
    }
    if (url.origin !== window.location.origin) continue;
    if (normalizePath(url.pathname) === normalizePath(window.location.pathname)) continue;
    return node;
  }
  return null;
}

export function RouteFocus() {
  const pathname = usePathname();
  const previousPath = useRef<string | null>(null);
  const ignorePopState = useRef(false);
  const pendingModality = useRef<"keyboard" | "pointer" | null>(null);

  useEffect(() => {
    const onPopState = () => {
      ignorePopState.current = true;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      if (!inAppRouteAnchor(event)) return;
      pendingModality.current = "keyboard";
      rememberPending("keyboard");
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
        return;
      }
      if (!inAppRouteAnchor(event)) return;
      pendingModality.current = "pointer";
      rememberPending("pointer");
    };
    const onPageHide = () => {
      if (pendingModality.current) rememberPending(pendingModality.current);
    };
    window.addEventListener("popstate", onPopState);
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);

  useEffect(() => {
    if (ignorePopState.current) {
      ignorePopState.current = false;
      previousPath.current = pathname;
      return;
    }
    if (previousPath.current === pathname) return;

    let cancelled = false;
    let attempts = 0;
    let decided = false;
    let shouldFocus = false;
    let pending: "keyboard" | "pointer" | null = null;
    let userTookOver = false;
    const startedAt = performance.now();
    const stopForUser = () => {
      userTookOver = true;
    };
    window.addEventListener("keydown", stopForUser, true);
    window.addEventListener("pointerdown", stopForUser, true);
    const focusHeading = () => {
      if (cancelled || userTookOver) return;
      const heading = document.getElementById(PAGE_HEADING_ID);
      const tagName = heading?.tagName.toLowerCase() ?? "";
      const upgraded = !tagName.includes("-") || customElements.get(tagName) !== undefined;
      if (!heading || !upgraded) {
        if (attempts < 60) {
          attempts += 1;
          requestAnimationFrame(focusHeading);
        }
        return;
      }

      if (!decided) {
        decided = true;
        const isDocumentEntry = previousPath.current === null;
        previousPath.current = pathname;
        pending = consumePending();
        const navigation = performance.getEntriesByType("navigation")[0];
        const navigationType = navigation && "type" in navigation ? navigation.type : "navigate";
        const restoredEntry =
          isDocumentEntry &&
          (pending === null || navigationType === "reload" || navigationType === "back_forward");
        shouldFocus = !restoredEntry;
      }
      if (!shouldFocus) return;

      if (document.activeElement !== heading) {
        if (!heading.hasAttribute("tabindex")) {
          heading.setAttribute("tabindex", "-1");
        }
        heading.focus({ focusVisible: pending === "keyboard" });
      }
      if (performance.now() - startedAt < 1000) {
        requestAnimationFrame(focusHeading);
      }
    };
    const firstFrame = requestAnimationFrame(focusHeading);
    return () => {
      cancelled = true;
      cancelAnimationFrame(firstFrame);
      window.removeEventListener("keydown", stopForUser, true);
      window.removeEventListener("pointerdown", stopForUser, true);
    };
  }, [pathname]);

  return null;
}
