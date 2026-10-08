"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { PAGE_HEADING_ID } from "@/app/lib/skip-to-page-heading";
import { beginRouteFocusHold, endRouteFocusHold } from "@/app/components/routing/route-focus-hold";

const ROUTE_FOCUS_KEY = "pds-ui-testing:route-focus";
const ROUTE_FOCUS_HOLD_MS = 1000;

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

/** `usePathname()` omits `NEXT_PUBLIC_BASE_PATH`; `location.pathname` includes it. */
function pathnameFromLocation(): string {
  const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
  let path = window.location.pathname;
  if (base && (path === base || path.startsWith(`${base}/`))) {
    path = path.slice(base.length) || "/";
  }
  return normalizePath(path);
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
  const ignoredPopPath = useRef<string | null>(null);
  const pendingModality = useRef<"keyboard" | "pointer" | null>(null);

  useEffect(() => {
    const onPopState = () => {
      const poppedPath = pathnameFromLocation();
      const currentPath = previousPath.current ? normalizePath(previousPath.current) : null;
      // A query or hash change does not update usePathname(). Remembering it
      // would skip focus on the next real route change.
      if (currentPath !== null && poppedPath === currentPath) {
        ignoredPopPath.current = null;
        return;
      }
      ignoredPopPath.current = poppedPath;
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
    if (ignoredPopPath.current !== null) {
      const poppedPath = ignoredPopPath.current;
      ignoredPopPath.current = null;
      if (poppedPath === normalizePath(pathname)) {
        previousPath.current = pathname;
        return;
      }
    }
    if (previousPath.current === pathname) return;

    beginRouteFocusHold();
    let cancelled = false;
    let attempts = 0;
    let decided = false;
    let shouldFocus = false;
    let pending: "keyboard" | "pointer" | null = null;
    let userTookOver = false;
    const startedAt = performance.now();
    const stopForUser = () => {
      userTookOver = true;
      endRouteFocusHold();
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
        } else {
          endRouteFocusHold();
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
        if (!shouldFocus) endRouteFocusHold();
      }
      if (!shouldFocus) return;

      if (document.activeElement !== heading) {
        if (!heading.hasAttribute("tabindex")) {
          heading.setAttribute("tabindex", "-1");
        }
        heading.focus({ focusVisible: pending === "keyboard" });
      }
      if (performance.now() - startedAt < ROUTE_FOCUS_HOLD_MS) {
        requestAnimationFrame(focusHeading);
      } else {
        endRouteFocusHold();
      }
    };
    const firstFrame = requestAnimationFrame(focusHeading);
    return () => {
      cancelled = true;
      endRouteFocusHold();
      cancelAnimationFrame(firstFrame);
      window.removeEventListener("keydown", stopForUser, true);
      window.removeEventListener("pointerdown", stopForUser, true);
    };
  }, [pathname]);

  return null;
}
