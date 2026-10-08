import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RouteFocus } from "@/app/components/routing/RouteFocus";
import { isRouteFocusHolding } from "@/app/components/routing/route-focus-hold";
import { PAGE_HEADING_ID } from "@/app/lib/skip-to-page-heading";

const ROUTE_FOCUS_KEY = "pds-ui-testing:route-focus";

let pathname = "/en/";
let navigationType: PerformanceNavigationTiming["type"] = "navigate";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

function setNavigationType(type: PerformanceNavigationTiming["type"]) {
  navigationType = type;
}

function renderRoute(initialPath = "/en/") {
  pathname = initialPath;
  window.history.replaceState(null, "", initialPath);
  return render(
    <>
      <h1 id={PAGE_HEADING_ID}>Products</h1>
      <RouteFocus />
    </>,
  );
}

function addLink(href: string, target?: string) {
  const link = document.createElement("a");
  link.href = href;
  if (target) link.target = target;
  link.textContent = "Open";
  document.body.append(link);
  return link;
}

describe("RouteFocus", () => {
  beforeEach(() => {
    sessionStorage.clear();
    setNavigationType("navigate");
    let now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      now += 1100;
      callback(now);
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.spyOn(performance, "getEntriesByType").mockImplementation((entryType) => {
      if (entryType === "navigation") {
        return [{ type: navigationType } as PerformanceNavigationTiming];
      }
      return [];
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("does not move focus on a fresh visit", () => {
    const focus = vi.spyOn(HTMLElement.prototype, "focus");

    renderRoute();

    expect(document.activeElement).not.toHaveProperty("id", PAGE_HEADING_ID);
    expect(focus).not.toHaveBeenCalled();
    expect(isRouteFocusHolding()).toBe(false);
  });

  it("does not move focus on reload or back/forward", () => {
    const focus = vi.spyOn(HTMLElement.prototype, "focus");
    sessionStorage.setItem(ROUTE_FOCUS_KEY, "keyboard");
    setNavigationType("reload");

    const view = renderRoute();
    expect(focus).not.toHaveBeenCalled();

    view.unmount();
    sessionStorage.setItem(ROUTE_FOCUS_KEY, "keyboard");
    setNavigationType("back_forward");
    renderRoute();

    expect(focus).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(ROUTE_FOCUS_KEY)).toBeNull();
  });

  it("focuses the heading after a keyboard route change and shows the focus ring", () => {
    const focus = vi.spyOn(HTMLElement.prototype, "focus");
    sessionStorage.setItem(ROUTE_FOCUS_KEY, "keyboard");

    renderRoute("/en/products/");

    const heading = document.getElementById(PAGE_HEADING_ID);
    expect(document.activeElement).toBe(heading);
    expect(heading).toHaveAttribute("tabindex", "-1");
    expect(focus).toHaveBeenCalledWith({ focusVisible: true });
    expect(sessionStorage.getItem(ROUTE_FOCUS_KEY)).toBeNull();
    expect(isRouteFocusHolding()).toBe(false);
  });

  it("focuses the heading after a pointer route change without a focus ring", () => {
    const focus = vi.spyOn(HTMLElement.prototype, "focus");
    sessionStorage.setItem(ROUTE_FOCUS_KEY, "pointer");

    renderRoute("/en/products/");

    expect(document.activeElement).toBe(document.getElementById(PAGE_HEADING_ID));
    expect(focus).toHaveBeenCalledWith({ focusVisible: false });
  });

  it("focuses the heading when the pathname changes in the same document", () => {
    const focus = vi.spyOn(HTMLElement.prototype, "focus");
    const view = renderRoute("/en/");
    expect(focus).not.toHaveBeenCalled();

    sessionStorage.setItem(ROUTE_FOCUS_KEY, "keyboard");
    pathname = "/en/products/";
    view.rerender(
      <>
        <h1 id={PAGE_HEADING_ID}>Products</h1>
        <RouteFocus />
      </>,
    );

    expect(document.activeElement).toBe(document.getElementById(PAGE_HEADING_ID));
    expect(focus).toHaveBeenCalledWith({ focusVisible: true });
  });

  it("does not move focus when the pathname change comes from back or forward", () => {
    const focus = vi.spyOn(HTMLElement.prototype, "focus");
    const view = renderRoute("/en/products/");
    window.history.pushState(null, "", "/en/");
    window.dispatchEvent(new PopStateEvent("popstate"));

    pathname = "/en/";
    view.rerender(
      <>
        <h1 id={PAGE_HEADING_ID}>Home</h1>
        <RouteFocus />
      </>,
    );

    expect(focus).not.toHaveBeenCalled();
  });

  it("still focuses the heading after a query-only back or forward", () => {
    const focus = vi.spyOn(HTMLElement.prototype, "focus");
    const view = renderRoute("/en/products/");
    window.history.pushState(null, "", "/en/products/?category=apparel");
    window.dispatchEvent(new PopStateEvent("popstate"));

    sessionStorage.setItem(ROUTE_FOCUS_KEY, "keyboard");
    pathname = "/en/contact/";
    view.rerender(
      <>
        <h1 id={PAGE_HEADING_ID}>Contact</h1>
        <RouteFocus />
      </>,
    );

    expect(document.activeElement).toBe(document.getElementById(PAGE_HEADING_ID));
    expect(focus).toHaveBeenCalledWith({ focusVisible: true });
  });

  it("records keyboard and pointer activations of in-app links", () => {
    renderRoute("/en/");
    const link = addLink("/en/products/");

    link.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }),
    );
    expect(sessionStorage.getItem(ROUTE_FOCUS_KEY)).toBe("keyboard");

    link.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 }));
    expect(sessionStorage.getItem(ROUTE_FOCUS_KEY)).toBe("pointer");
  });

  it("ignores modified, external, same-page, and new-tab links", () => {
    renderRoute("/en/");
    const samePage = addLink("/en/");
    const external = addLink("https://example.com/products/");
    const newTab = addLink("/en/products/", "_blank");

    samePage.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    external.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    newTab.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 }));
    samePage.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, button: 0, metaKey: true }),
    );

    expect(sessionStorage.getItem(ROUTE_FOCUS_KEY)).toBeNull();
  });

  it("keeps the modality for the next document when the page unloads", () => {
    renderRoute("/en/");
    const link = addLink("/en/products/");
    link.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    sessionStorage.removeItem(ROUTE_FOCUS_KEY);

    window.dispatchEvent(new PageTransitionEvent("pagehide"));

    expect(sessionStorage.getItem(ROUTE_FOCUS_KEY)).toBe("keyboard");
  });
});
