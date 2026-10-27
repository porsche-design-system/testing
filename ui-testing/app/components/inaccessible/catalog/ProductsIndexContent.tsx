import { PText } from "@porsche-design-system/components-react/ssr";
import { Suspense } from "react";
import { CatalogProductGrid } from "@/app/components/inaccessible/catalog/CatalogProductGrid";
import { ProductCatalogBrowser } from "@/app/components/inaccessible/catalog/ProductCatalogBrowser";
import { MainContent } from "@/app/components/inaccessible/layout/MainContent";
import type { CatalogProduct } from "@/app/data/get-catalog";
import type { Locale } from "@/app/i18n/config";
import type { Dictionary } from "@/app/i18n/get-dictionary";

type Props = {
  copy: Dictionary["pages"]["productList"];
  locale: Locale;
  products: CatalogProduct[];
};

/**
 * Intentional defects:
 * - Page title rendered as a styled `<div>` instead of `<h1>` (`page-has-heading-one`)
 * - Subtitle uses low-contrast text (`color-contrast`)
 */
export function ProductsIndexContent({ copy, locale, products }: Props) {
  return (
    <MainContent className="grid-template mt-fluid-xl">
      <div className="col-wide mx-auto flex max-w-[720px] flex-col items-center gap-fluid-sm text-center">
        <div className="prose-heading-3xl font-semibold">{copy.title}</div>
        <PText className="inaccessible-low-contrast" color="inherit" size="sm">
          {copy.subtitle}
        </PText>
      </div>
      <Suspense
        fallback={
          <CatalogProductGrid
            locale={locale}
            newReleaseTagLabel={copy.newReleaseTag}
            pricingCopy={copy.pricing}
            products={products}
            sectionAriaLabel={copy.productsRegionLabel}
          />
        }
      >
        <ProductCatalogBrowser
          copy={copy}
          locale={locale}
          products={products}
        />
      </Suspense>
    </MainContent>
  );
}
