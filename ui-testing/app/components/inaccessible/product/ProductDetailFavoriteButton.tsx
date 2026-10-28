"use client";

import { PButton } from "@porsche-design-system/components-react/ssr";
import { useProductFavorites } from "@/app/components/shared/favorites/ProductFavoritesProvider";

type Props = {
  productSlug: string;
  labelAdd: string;
  labelRemove: string;
};

/**
 * Intentional PDS Don't (`button-name` / WCAG 4.1.2):
 * - Uses `hideLabel={true}` with empty children and omits `aria-label` and `aria-pressed`
 */
export function ProductDetailFavoriteButton({ productSlug }: Props) {
  const { isFavorite, setLiked } = useProductFavorites();
  const pressed = isFavorite(productSlug);

  return (
    <PButton
      data-testid="product-detail-favorite-button"
      hideLabel={true}
      icon={pressed ? "heart-filled" : "heart"}
      onClick={() => setLiked(productSlug, !pressed)}
      type="button"
      variant="secondary"
    />
  );
}
