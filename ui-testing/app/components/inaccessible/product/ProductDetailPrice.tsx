import { PText } from "@porsche-design-system/components-react/ssr";
import { isReducedProduct } from "@/app/data/catalog-price";
import type { CatalogProduct } from "@/app/data/get-catalog";

type PricingCopy = {
  detailAriaReduced: string;
};

type Props = {
  copy: PricingCopy;
  product: CatalogProduct;
};

/**
 * Intentional WCAG 1.3.1 & 1.4.3 defects:
 * - Reduced price uses a visual `line-through` span instead of semantic `<s>` and omits `.sr-only` reduced price explanation
 * - VAT note uses low-contrast text (`color-contrast`)
 */
export function ProductDetailPrice({ product }: Props) {
  if (!isReducedProduct(product)) {
    return (
      <div className="grid gap-static-xs">
        <PText size="lg" weight="semibold">
          {product.price.formatted}
        </PText>
        <PText className="inaccessible-low-contrast" size="sm">
          {product.vatNote}
        </PText>
      </div>
    );
  }

  return (
    <div className="grid gap-static-xs">
      <div className="flex flex-wrap items-baseline gap-static-xs">
        <PText size="lg" weight="semibold">
          {product.price.formatted}
        </PText>
        <PText className="inaccessible-low-contrast" size="lg">
          <span className="line-through">
            {product.priceOriginal.formatted}
          </span>
        </PText>
      </div>
      <PText className="inaccessible-low-contrast" size="sm">
        {product.vatNote}
      </PText>
    </div>
  );
}
