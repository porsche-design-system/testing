import { expect, test } from "@playwright/test";
import { waitForPdsHost } from "../utils/pds";

const PRODUCT_SLUG = "porsche-design-baseball-cap";

test.describe("inaccessible variant mouse flows (static preview)", () => {
  test("home hero CTA modal and navigation work via mouse clicks", async ({
    page,
  }) => {
    await page.goto("/inaccessible/en/", { waitUntil: "networkidle" });
    await expect(page.getByTestId("global-header")).toBeVisible();
    await expect(page.getByTestId("main-content")).toBeVisible();

    const cta = page.getByTestId("hero-cta-button");
    await expect(cta).toBeVisible();
    await cta.click();

    await expect(
      page.getByText(/what makes racing design iconic\?/i),
    ).toBeVisible();
  });

  test("catalog filter chips and product detail interactions work via mouse", async ({
    page,
  }) => {
    await page.goto("/inaccessible/en/products/?audience=men", {
      waitUntil: "networkidle",
    });
    await expect(page.getByTestId("main-content")).toBeVisible();

    const chip = page.getByTestId("dismiss-filter-audience-men");
    await expect(chip).toBeVisible();
    await chip.click();
    await expect(page).toHaveURL(/\/inaccessible\/en\/products\/?$/);

    await page.goto(`/inaccessible/en/products/${PRODUCT_SLUG}/`, {
      waitUntil: "networkidle",
    });
    await expect(page.getByTestId("main-content")).toBeVisible();

    const favBtn = page.getByTestId("product-detail-favorite-button");
    await waitForPdsHost(page, "p-button");
    await favBtn.click();

    await expect(
      page.getByTestId("header-favorites-link").getByText("1", { exact: true }),
    ).toBeVisible();
  });

  test("disables PDS focus ring color via CSS custom property override", async ({
    page,
  }) => {
    await page.goto("/inaccessible/en/contact/", { waitUntil: "networkidle" });
    await expect(page.getByTestId("main-content")).toBeVisible();
    await waitForPdsHost(page, "p-button");

    const focusState = await page.evaluate(() => {
      const rootFocusColor = getComputedStyle(document.documentElement)
        .getPropertyValue("--p-color-focus")
        .trim();
      const pButton = document.querySelector("form p-button");
      const innerBtn = pButton?.shadowRoot?.querySelector<HTMLElement>("button");
      innerBtn?.focus();
      const outlineColor = innerBtn ? getComputedStyle(innerBtn).outlineColor : "";
      return { rootFocusColor, outlineColor };
    });

    expect(focusState.rootFocusColor).toBe("transparent");
    expect(focusState.outlineColor).toBe("rgba(0, 0, 0, 0)");
  });
});
