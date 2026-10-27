import { PPopover, PTag } from "@porsche-design-system/components-react/ssr";
import type { TilePricingCopy } from "@/app/components/favorites/FavoriteLinkTileProduct";
import { FavoriteLinkTileProduct } from "@/app/components/inaccessible/favorites/FavoriteLinkTileProduct";
import { productHasNewReleaseFlag } from "@/app/data/catalog-product-flags";
import type { CatalogProduct } from "@/app/data/get-catalog";
import type { Locale } from "@/app/i18n/config";

type Props = {
  sectionAriaLabel: string;
  locale: Locale;
  newReleaseTagLabel: string;
  pricingCopy?: TilePricingCopy;
  products: CatalogProduct[];
};

/**
 * Intentional WCAG defects:
 * - Generic `<div>` instead of `<section aria-label>` and `<article aria-label>`
 */
export function CatalogProductGrid({
  newReleaseTagLabel,
  pricingCopy,
  locale,
  products,
}: Props) {
  return (
    <div className="col-full grid grid-cols-subgrid">
      <div className="col-basic grid grid-cols-subgrid gap-fluid-md">
        {products.map((product) => (
          <div
            className="col-span-full scroll-mt-fluid-lg md:col-span-one-third"
            id={product.id}
            key={product.id}
          >
            <FavoriteLinkTileProduct
              locale={locale}
              pricingCopy={pricingCopy}
              product={product}
            >
              <span className="relative z-1" slot="header">
                {productHasNewReleaseFlag(product) ? (
                  <PTag compact>{newReleaseTagLabel}</PTag>
                ) : null}
                <PPopover>{product.description}</PPopover>
              </span>
            </FavoriteLinkTileProduct>
          </div>
        ))}
      </div>
    </div>
  );
}
