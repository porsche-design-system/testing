"use client";

import { useCallback, useState } from "react";
import {
  PButtonPure,
  PDrilldown,
  PDrilldownItem,
  PDrilldownLink,
} from "@porsche-design-system/components-react/ssr";
import type { DrilldownUpdateEventDetail } from "@porsche-design-system/components-react/ssr";
import type { Locale } from "@/app/i18n/config";
import type { Dictionary } from "@/app/i18n/get-dictionary";
import { INACCESSIBLE_ROUTE_PREFIX, productsFilterHref } from "@/app/i18n/href";

const SHOP_NAV_DRILLDOWN_ID = "shop-navigation-drilldown";

type Props = {
  locale: Locale;
  nav: Dictionary["nav"];
  menuButtonClassName?: string;
};

/**
 * Intentional PDS anti-patterns:
 * - `PButtonPure` uses `hideLabel={true}` with empty children and no `aria-expanded` / `aria-haspopup`
 * - `PDrilldown` omits `aria={{ "aria-label": ... }}`
 */
export function GlobalHeaderNavMenu({
  locale,
  nav,
  menuButtonClassName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [activeIdentifier, setActiveIdentifier] = useState<
    string | undefined
  >();

  const toggleOpen = useCallback(() => {
    setOpen((value) => !value);
  }, []);

  const handleDismiss = useCallback(() => {
    setOpen(false);
    setActiveIdentifier(undefined);
  }, []);

  const handleUpdate = useCallback(
    (event: CustomEvent<DrilldownUpdateEventDetail>) => {
      setActiveIdentifier(event.detail.activeIdentifier);
    },
    [],
  );

  return (
    <>
      <PButtonPure
        className={
          menuButtonClassName
            ? `${menuButtonClassName} p-static-xs -m-static-xs`
            : "p-static-xs -m-static-xs"
        }
        data-testid="nav-menu-trigger"
        hideLabel={true}
        icon="menu-lines"
        onClick={toggleOpen}
        size={{ base: "sm", m: "md" }}
        type="button"
      />
      <PDrilldown
        activeIdentifier={activeIdentifier}
        id={SHOP_NAV_DRILLDOWN_ID}
        onDismiss={handleDismiss}
        onUpdate={handleUpdate}
        open={open}
      >
        <PDrilldownItem identifier="apparel" label={nav.clothing}>
          <PDrilldownLink
            href={productsFilterHref(
              locale,
              { audiences: ["women"] },
              INACCESSIBLE_ROUTE_PREFIX,
            )}
          >
            {nav.viewAllWomen}
          </PDrilldownLink>
          <PDrilldownLink
            href={productsFilterHref(
              locale,
              { audiences: ["men"] },
              INACCESSIBLE_ROUTE_PREFIX,
            )}
          >
            {nav.viewAllMen}
          </PDrilldownLink>
          <PDrilldownLink
            href={productsFilterHref(
              locale,
              { audiences: ["kids"] },
              INACCESSIBLE_ROUTE_PREFIX,
            )}
          >
            {nav.viewAllKids}
          </PDrilldownLink>
          <PDrilldownLink
            href={productsFilterHref(
              locale,
              { categories: ["apparel"] },
              INACCESSIBLE_ROUTE_PREFIX,
            )}
          >
            {nav.viewAllProducts}
          </PDrilldownLink>
        </PDrilldownItem>
        <PDrilldownItem identifier="accessories" label={nav.accessories}>
          <PDrilldownLink
            href={productsFilterHref(
              locale,
              { categories: ["bags-luggage"] },
              INACCESSIBLE_ROUTE_PREFIX,
            )}
          >
            {nav.bagsLuggage}
          </PDrilldownLink>
          <PDrilldownLink
            href={productsFilterHref(
              locale,
              { categories: ["travel-transport"] },
              INACCESSIBLE_ROUTE_PREFIX,
            )}
          >
            {nav.travelTransport}
          </PDrilldownLink>
          <PDrilldownLink
            href={productsFilterHref(
              locale,
              { categories: ["accessories"] },
              INACCESSIBLE_ROUTE_PREFIX,
            )}
          >
            {nav.chargingHardware}
          </PDrilldownLink>
          <PDrilldownLink
            href={productsFilterHref(
              locale,
              { categories: ["accessories"] },
              INACCESSIBLE_ROUTE_PREFIX,
            )}
          >
            {nav.viewAllProducts}
          </PDrilldownLink>
        </PDrilldownItem>
        <PDrilldownLink
          href={productsFilterHref(
            locale,
            { collections: ["porsche-originals"] },
            INACCESSIBLE_ROUTE_PREFIX,
          )}
        >
          {nav.porscheOriginals}
        </PDrilldownLink>
        <PDrilldownLink
          href={productsFilterHref(
            locale,
            { collections: ["porsche-design"] },
            INACCESSIBLE_ROUTE_PREFIX,
          )}
        >
          {nav.porscheDesign}
        </PDrilldownLink>
        <PDrilldownLink
          href={productsFilterHref(
            locale,
            { flags: ["new-release"] },
            INACCESSIBLE_ROUTE_PREFIX,
          )}
        >
          {nav.newReleases}
        </PDrilldownLink>
      </PDrilldown>
    </>
  );
}
