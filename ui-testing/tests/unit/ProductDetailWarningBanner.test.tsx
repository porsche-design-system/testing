import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PRODUCT_DETAIL_BANNER_DELAY_MS,
  ProductDetailWarningBanner,
  ROUTE_FOCUS_RELEASE_POLL_MS,
} from "@/app/components/product/ProductDetailWarningBanner";
import {
  beginRouteFocusHold,
  endRouteFocusHold,
} from "@/app/components/routing/route-focus-hold";
import { PAGE_HEADING_ID } from "@/app/lib/skip-to-page-heading";

vi.mock("@porsche-design-system/components-react/ssr", () => ({
  PBanner: ({
    description,
    dismissButton,
    heading,
    headingTag,
    onDismiss,
    open,
    state,
  }: {
    description?: string;
    dismissButton?: boolean;
    heading?: string;
    headingTag?: string;
    onDismiss?: () => void;
    open?: boolean;
    state?: string;
  }) =>
    open ? (
      <div
        data-dismiss-button={dismissButton}
        data-heading-tag={headingTag}
        data-state={state}
        data-testid="warning-banner"
        role="status"
      >
        <h2>{heading}</h2>
        <p>{description}</p>
        {dismissButton ? (
          <button onClick={onDismiss} type="button">
            Close banner
          </button>
        ) : null}
      </div>
    ) : null,
}));

const copy = {
  heading: "Limited availability",
  description:
    "This item is running low on stock. Please inquire about availability before placing an order.",
} as const;

describe("ProductDetailWarningBanner", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    endRouteFocusHold();
    vi.useRealTimers();
  });

  it("stays closed on the first paint, then announces the message", () => {
    render(<ProductDetailWarningBanner copy={copy} showBanner={true} />);

    expect(screen.queryByTestId("warning-banner")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(PRODUCT_DETAIL_BANNER_DELAY_MS);
    });

    const banner = screen.getByTestId("warning-banner");
    expect(banner).toHaveAttribute("data-state", "info");
    expect(banner).toHaveAttribute("data-heading-tag", "h2");
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: copy.heading,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(copy.description)).toBeInTheDocument();
  });

  it("waits until route focus stops moving to the heading", () => {
    beginRouteFocusHold();
    render(<ProductDetailWarningBanner copy={copy} showBanner={true} />);

    act(() => {
      vi.advanceTimersByTime(PRODUCT_DETAIL_BANNER_DELAY_MS);
    });
    expect(screen.queryByTestId("warning-banner")).not.toBeInTheDocument();

    act(() => {
      endRouteFocusHold();
      vi.advanceTimersByTime(ROUTE_FOCUS_RELEASE_POLL_MS);
    });

    expect(screen.getByRole("heading", { level: 2, name: copy.heading })).toBeInTheDocument();
  });

  it("does not open when the product has no availability notice", () => {
    render(<ProductDetailWarningBanner copy={copy} showBanner={false} />);

    act(() => {
      vi.advanceTimersByTime(PRODUCT_DETAIL_BANNER_DELAY_MS);
    });

    expect(screen.queryByTestId("warning-banner")).not.toBeInTheDocument();
  });

  it("dismisses the banner when the close button is clicked", () => {
    render(<ProductDetailWarningBanner copy={copy} showBanner={true} />);
    act(() => {
      vi.advanceTimersByTime(PRODUCT_DETAIL_BANNER_DELAY_MS);
    });

    fireEvent.click(screen.getByRole("button", { name: "Close banner" }));

    expect(screen.queryByTestId("warning-banner")).not.toBeInTheDocument();
  });

  it("moves focus to the page heading without a ring when the banner is clicked closed", () => {
    const focus = vi.spyOn(HTMLElement.prototype, "focus");
    render(
      <>
        <h1 id={PAGE_HEADING_ID}>Cap</h1>
        <ProductDetailWarningBanner copy={copy} showBanner={true} />
      </>,
    );
    act(() => {
      vi.advanceTimersByTime(PRODUCT_DETAIL_BANNER_DELAY_MS);
    });

    const button = screen.getByRole("button", { name: "Close banner" });
    fireEvent.pointerDown(button, { button: 0 });
    fireEvent.click(button);

    const heading = document.getElementById(PAGE_HEADING_ID);
    expect(document.activeElement).toBe(heading);
    expect(heading).toHaveAttribute("tabindex", "-1");
    expect(focus).toHaveBeenCalledWith({ focusVisible: false });
  });

  it("shows the heading focus ring when the banner is closed from the keyboard", () => {
    const focus = vi.spyOn(HTMLElement.prototype, "focus");
    render(
      <>
        <h1 id={PAGE_HEADING_ID}>Cap</h1>
        <ProductDetailWarningBanner copy={copy} showBanner={true} />
      </>,
    );
    act(() => {
      vi.advanceTimersByTime(PRODUCT_DETAIL_BANNER_DELAY_MS);
    });

    const button = screen.getByRole("button", { name: "Close banner" });
    fireEvent.keyDown(button, { key: "Enter" });
    fireEvent.click(button);

    expect(document.activeElement).toBe(document.getElementById(PAGE_HEADING_ID));
    expect(focus).toHaveBeenCalledWith({ focusVisible: true });
  });
});
