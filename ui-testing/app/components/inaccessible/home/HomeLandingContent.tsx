import {
  PAiTag,
  PCarousel,
  PHeading,
  PLink,
  PLinkPure,
  PLinkTile,
  PTag,
  PText,
} from "@porsche-design-system/components-react/ssr";
import type { TilePricingCopy } from "@/app/components/favorites/FavoriteLinkTileProduct";
import { FavoriteLinkTileProduct } from "@/app/components/inaccessible/favorites/FavoriteLinkTileProduct";
import {
  isLifestyleTagSlug,
  lifestyleTagSlugs,
} from "@/app/data/catalog/taxonomy";
import type { CatalogProduct } from "@/app/data/get-catalog";
import type { Locale } from "@/app/i18n/config";
import type { Dictionary } from "@/app/i18n/get-dictionary";
import {
  appHref,
  INACCESSIBLE_ROUTE_PREFIX,
  productsFilterHref,
  productsIndexHref,
} from "@/app/i18n/href";

type HomeCopy = Dictionary["pages"]["home"];

const LIFESTYLE_IMAGE_PATHS = [
  "/home-lifestyle-timeless.jpg",
  "/home-lifestyle-loyalist.jpg",
  "/home-lifestyle-urbanist.jpg",
] as const;

const FEATURE_IMAGE_PATHS = [
  "/home-feature-roadster.png",
  "/home-feature-travel-transport.jpg",
] as const;

type Props = {
  home: HomeCopy;
  locale: Locale;
  tilePricingCopy: TilePricingCopy;
  trendingProducts: CatalogProduct[];
};

function lifestyleTileHref(locale: Locale, lifestyleTag: string): string {
  return isLifestyleTagSlug(lifestyleTag)
    ? productsFilterHref(locale, { tags: [lifestyleTag] }, INACCESSIBLE_ROUTE_PREFIX)
    : productsIndexHref(locale, INACCESSIBLE_ROUTE_PREFIX);
}

function allLifestyleTagsHref(locale: Locale): string {
  return productsFilterHref(
    locale,
    { tags: [...lifestyleTagSlugs] },
    INACCESSIBLE_ROUTE_PREFIX,
  );
}

function featureTileHref(locale: Locale, href: string, index: number): string {
  if (index === 0) {
    return productsFilterHref(
      locale,
      {
        categories: ["bags-luggage"],
        flags: ["featured"],
      },
      INACCESSIBLE_ROUTE_PREFIX,
    );
  }
  if (index === 1) {
    return productsFilterHref(
      locale,
      { categories: ["travel-transport"] },
      INACCESSIBLE_ROUTE_PREFIX,
    );
  }
  return href;
}

/**
 * Intentional PDS & WCAG defects:
 * - Generic `<div>` instead of `<section aria-labelledby>`
 * - Skipped heading levels (`tag="h4"` / `tag="h5"` with `size="3xl"`)
 * - Slotted `<img>` inside `PLinkTile` omits `alt` attribute (`image-alt`)
 * - `PCarousel` omits `aria={{ "aria-label": ... }}` and `intl` labels
 */
export function HomeLandingContent({
  home,
  locale,
  tilePricingCopy,
  trendingProducts,
}: Props) {
  return (
    <>
      <div className="col-full grid grid-cols-subgrid">
        <div className="col-wide flex flex-col gap-fluid-sm items-center mt-fluid-2xl">
          <PTag compact variant="primary">
            {home.lookbookTag}
          </PTag>
          <PText align="center" className="max-w-[635px]" size="xl">
            {home.intro}
          </PText>
          <PLink
            className="mt-fluid-md"
            href={allLifestyleTagsHref(locale)}
            variant="primary"
          >
            {home.shopTheLook}
          </PLink>
        </div>
        <div className="col-basic grid grid-cols-subgrid gap-fluid-md mt-fluid-xl">
          {home.lifestyleTiles.map((tile, index) => (
            <PLinkTile
              align="bottom"
              aspectRatio="3/4"
              className="col-span-full md:col-span-one-third"
              compact
              description={tile.description}
              gradient
              href={lifestyleTileHref(locale, tile.lifestyleTag)}
              key={tile.lifestyleTag}
              label={tile.label}
              size="large"
            >
              {tile.tagLabel ? (
                <PTag compact slot="header" variant="success">
                  {tile.tagLabel}
                </PTag>
              ) : (
                <PAiTag slot="header" />
              )}
              {/* Intentional PDS Don't / axe `image-alt` violation: <img> without alt */}
              {/* biome-ignore lint/a11y/useAltText: Intentional defect for inaccessible testing variant. */}
              <img
                src={appHref(
                  LIFESTYLE_IMAGE_PATHS[index] ?? LIFESTYLE_IMAGE_PATHS[0],
                )}
              />
            </PLinkTile>
          ))}
        </div>
      </div>

      <div className="col-full grid grid-cols-subgrid" id="products">
        <div className="col-wide flex flex-col items-center text-center mt-fluid-2xl">
          {/* Intentional heading-order / tag≠size mismatch */}
          <PHeading size="3xl" tag="h4">
            {home.trendingHeading}
          </PHeading>
          <PLinkPure
            className="mt-fluid-sm"
            href={productsIndexHref(locale, INACCESSIBLE_ROUTE_PREFIX)}
            icon="arrow-right"
            underline={true}
          >
            {home.trendingLinkLabel}
          </PLinkPure>
        </div>
        <div className="col-full mt-fluid-lg">
          {/* Intentional PDS Don't: PCarousel without aria-label orheading */}
          <PCarousel
            pagination
            slidesPerPage={{ base: 1, s: 2, m: 3 }}
            width="basic"
          >
            {trendingProducts.slice(0, 5).map((product) => (
              <FavoriteLinkTileProduct
                key={product.id}
                locale={locale}
                pricingCopy={tilePricingCopy}
                product={product}
              />
            ))}
          </PCarousel>
        </div>
      </div>

      <div className="col-full grid grid-cols-subgrid mt-fluid-2xl">
        <div className="col-wide flex flex-col items-center text-center">
          <PHeading size="3xl" tag="h5">
            {home.featureHeading}
          </PHeading>
        </div>
        <div className="col-wide grid grid-cols-subgrid gap-fluid-md mt-fluid-lg">
          {home.featureTiles.map((tile, index) => (
            <PLinkTile
              align="top"
              aspectRatio="3/4"
              className="col-span-full md:col-span-one-half"
              compact
              description={tile.description}
              gradient
              href={featureTileHref(locale, tile.href, index)}
              key={tile.href}
              label={tile.label}
              size="large"
            >
              {/* Intentional axe `image-alt` violation: <img> without alt */}
              {/* biome-ignore lint/a11y/useAltText: Intentional defect for inaccessible testing variant. */}
              <img
                src={appHref(
                  FEATURE_IMAGE_PATHS[index] ?? FEATURE_IMAGE_PATHS[0],
                )}
              />
            </PLinkTile>
          ))}
        </div>
      </div>
    </>
  );
}
