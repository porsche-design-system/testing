"use client";

import { useCallback } from "react";
import { PLinkTileProduct } from "@porsche-design-system/components-react/ssr";
import type { TilePricingCopy } from "@/app/components/accessible/favorites/FavoriteLinkTileProduct";
import { useProductFavorites } from "@/app/components/shared/favorites/ProductFavoritesProvider";
import { isReducedProduct } from "@/app/data/catalog-price";
import type { CatalogProduct } from "@/app/data/get-catalog";
import type { Locale } from "@/app/i18n/config";
import {
  appHref,
  INACCESSIBLE_ROUTE_PREFIX,
  productDetailHref,
} from "@/app/i18n/href";

type Props = {
  locale: Locale;
  product: CatalogProduct;
  aspectRatio?: "3/4" | "9/16";
  children?: React.ReactNode;
  pricingCopy?: TilePricingCopy;
};

/**
 * Intentional PDS & WCAG defects:
 * - Slotted `<img>` omits `alt` attribute (`image-alt` violation)
 * - Slotted `<a slot="anchor">` omits reduced-price screen reader context (`<s>` / sale label)
 */
export function FavoriteLinkTileProduct({
  aspectRatio = "3/4",
  children,
  locale,
  product,
}: Props) {
  const { isFavorite, toggleFavorite } = useProductFavorites();
  const liked = isFavorite(product.slug);
  const reduced = isReducedProduct(product);

  const onLike = useCallback(() => {
    toggleFavorite(product.slug);
  }, [product.slug, toggleFavorite]);

  const detailHref = productDetailHref(
    locale,
    product.slug,
    INACCESSIBLE_ROUTE_PREFIX,
  );

  return (
    <PLinkTileProduct
      aspectRatio={aspectRatio}
      description={product.vatNote}
      heading={product.name}
      liked={liked}
      onLike={onLike}
      price={product.price.formatted}
      priceOriginal={reduced ? product.priceOriginal.formatted : undefined}
    >
      <a href={detailHref} slot="anchor">
        {product.name}
      </a>
      {children}
      {/* Intentional axe `image-alt` violation: <img> without alt */}
      {/* biome-ignore lint/a11y/useAltText: Intentional defect for inaccessible testing variant. */}
      <img
        src={appHref(product.images[0]?.src ?? "/home-product-keychain.jpg")}
      />
    </PLinkTileProduct>
  );
}
