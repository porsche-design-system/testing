import { PCrest, PWordmark } from "@porsche-design-system/components-react/ssr";
import type { Locale } from "@/app/i18n/config";
import type { Dictionary } from "@/app/i18n/get-dictionary";
import { INACCESSIBLE_ROUTE_PREFIX, localeHomeHref } from "@/app/i18n/href";
import { GlobalHeaderFavoritesLink } from "./GlobalHeaderFavoritesLink";
import { GlobalHeaderNavMenu } from "./GlobalHeaderNavMenu";
import { GlobalHeaderProductSearch } from "./GlobalHeaderProductSearch";

type Props = {
  dictionary: Dictionary;
  locale: Locale;
  /** Transparent bar over the home hero (see landing-page template). */
  heroOverlay?: boolean;
};

/**
 * Intentional accessibility defects:
 * - Uses generic `<div>` instead of `<header>` and `<nav>` landmarks (WCAG 1.3.1, 2.4.1)
 * - Omits `GlobalHeaderSkipLink` (no bypass block, WCAG 2.4.1)
 * - Omits `aria` label on `PCrest` (PDS Don't: linked crest without accessible name)
 */
export function GlobalHeader({
  dictionary,
  locale,
  heroOverlay = false,
}: Props) {
  const { header, nav } = dictionary;
  const homeHref = localeHomeHref(locale, INACCESSIBLE_ROUTE_PREFIX);

  return (
    <div
      className={
        heroOverlay
          ? "z-30 grid-template absolute inset-x-0 top-0 px-fluid-sm py-fluid-sm sm:px-fluid-md md:px-fluid-lg md:py-fluid-md"
          : "grid-template bg-canvas py-fluid-sm md:py-fluid-md"
      }
      data-testid="global-header"
      style={heroOverlay ? { boxSizing: "border-box" } : undefined}
    >
      <div className="col-wide grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-fluid-xs sm:gap-fluid-md">
        <div className="relative flex min-w-0 flex-wrap items-center justify-start gap-static-xs sm:gap-static-sm">
          {/* Intentional defect: generic <div> instead of <nav aria-label> and no skip link */}
          <div className="flex min-w-0 items-center" id="main-navigation">
            <GlobalHeaderNavMenu
              locale={locale}
              menuButtonClassName={heroOverlay ? "scheme-dark" : undefined}
              nav={nav}
            />
          </div>
        </div>
        <div className="flex shrink-0 justify-center">
          {/* Intentional PDS Don't: omit aria={{ "aria-label": ... }} on linked PCrest */}
          <PCrest
            className={heroOverlay ? "scheme-dark sm:hidden" : "sm:hidden"}
            href={homeHref}
          />
          <PWordmark
            className={
              heroOverlay
                ? "scheme-dark max-sm:hidden shrink-0"
                : "max-sm:hidden shrink-0"
            }
            href={homeHref}
            size="small"
          />
        </div>
        <div
          className={
            heroOverlay
              ? "scheme-dark flex min-w-0 flex-wrap items-center justify-end gap-static-xs sm:gap-static-md"
              : "flex min-w-0 flex-wrap items-center justify-end gap-static-xs sm:gap-static-md"
          }
        >
          <GlobalHeaderFavoritesLink
            copy={{
              favorites: header.favorites,
              favoritesAriaCount: header.favoritesAriaCount,
              favoritesAriaEmpty: header.favoritesAriaEmpty,
              favoritesLiveCount: header.favoritesLiveCount,
              favoritesLiveEmpty: header.favoritesLiveEmpty,
            }}
            locale={locale}
          />
          <GlobalHeaderProductSearch
            copy={header.searchModal}
            label={header.search}
            locale={locale}
            triggerSchemeClassName={heroOverlay ? "scheme-dark" : undefined}
          />
        </div>
      </div>
    </div>
  );
}
