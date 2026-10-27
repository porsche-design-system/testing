"use client";

import { PLinkPure } from "@porsche-design-system/components-react/ssr";
import { useProductFavorites } from "@/app/components/shared/favorites/ProductFavoritesProvider";
import type { Locale } from "@/app/i18n/config";
import type { Dictionary } from "@/app/i18n/get-dictionary";
import {
  INACCESSIBLE_ROUTE_PREFIX,
  productsFavoritesHref,
} from "@/app/i18n/href";

export type GlobalHeaderFavoritesCopy = Pick<
  Dictionary["header"],
  | "favorites"
  | "favoritesAriaCount"
  | "favoritesAriaEmpty"
  | "favoritesLiveCount"
  | "favoritesLiveEmpty"
>;

type Props = {
  copy: GlobalHeaderFavoritesCopy;
  locale: Locale;
};

/**
 * Intentional PDS & WCAG defects:
 * - `PLinkPure` uses `hideLabel={true}` with empty children and no `aria-label` (`link-name` violation)
 * - Count badge is not `aria-hidden`
 * - Omits `aria-live` status region when favorites count changes (WCAG 4.1.3)
 */
export function GlobalHeaderFavoritesLink({ locale }: Props) {
  const { favoriteSlugs } = useProductFavorites();
  const count = favoriteSlugs.length;
  const href = productsFavoritesHref(locale, INACCESSIBLE_ROUTE_PREFIX);

  return (
    <span className="relative inline-flex" data-testid="header-favorites-link">
      <PLinkPure
        className="p-static-xs -m-static-xs"
        hideLabel={true}
        href={href}
        icon="heart"
        size={{ base: "sm", m: "md" }}
      />
      {count > 0 ? (
        <span className="pointer-events-none absolute top-0 end-0 flex min-h-[1.125rem] min-w-[1.125rem] translate-x-1/4 -translate-y-1/4 items-center justify-center rounded-full bg-contrast-high px-static-xxs text-[0.625rem] font-semibold leading-none text-canvas tabular-nums">
          {count}
        </span>
      ) : null}
    </span>
  );
}
