import {
  PDivider,
  PHeading,
  PLinkPure,
  PTag,
  PText,
} from "@porsche-design-system/components-react/ssr";
import { notFound } from "next/navigation";
import { CatalogProductGrid } from "@/app/components/inaccessible/catalog/CatalogProductGrid";
import { MainContent } from "@/app/components/inaccessible/layout/MainContent";
import { ProductDetailFavoriteButton } from "@/app/components/inaccessible/product/ProductDetailFavoriteButton";
import { ProductDetailPrice } from "@/app/components/inaccessible/product/ProductDetailPrice";
import { ProductDetailSections } from "@/app/components/inaccessible/product/ProductDetailSections";
import { ProductDetailWarningBanner } from "@/app/components/inaccessible/product/ProductDetailWarningBanner";
import { ProductInquiryFlyout } from "@/app/components/inaccessible/product/ProductInquiryFlyout";
import { ProductSizeComparisonSheet } from "@/app/components/inaccessible/product/ProductSizeComparisonSheet";
import { ProductSizeSelector } from "@/app/components/inaccessible/product/ProductSizeSelector";
import { productHasNewReleaseFlag } from "@/app/data/catalog-product-flags";
import {
  getCatalogProductBySlug,
  getHomeCatalog,
  getRelatedCatalogProducts,
} from "@/app/data/get-catalog";
import { isLocale, type Locale, locales } from "@/app/i18n/config";
import { getDictionary } from "@/app/i18n/get-dictionary";
import {
  appHref,
  INACCESSIBLE_ROUTE_PREFIX,
  productsIndexHref,
} from "@/app/i18n/href";

export const dynamicParams = false;

type PageProps = {
  params: Promise<{ locale: string; productSlug: string }>;
};

export async function generateStaticParams() {
  const params = await Promise.all(
    locales.map(async (locale) => {
      const catalog = await getHomeCatalog(locale);
      return catalog.products.map((product) => ({
        locale,
        productSlug: product.slug,
      }));
    }),
  );
  return params.flat();
}

function labelsFor(values: readonly string[], labels: Record<string, string>) {
  return values.map((value) => labels[value] ?? value);
}

/**
 * Intentional PDS & HTML defects on Product Detail:
 * - Main product `<img>` omits `alt` attribute (`image-alt`)
 * - Product title rendered as a styled `<div>` instead of `<h1>` (`page-has-heading-one`)
 * - Skipped heading levels (`tag="h5"` on sections)
 * - Generic `<div>` instead of `<section aria-labelledby>`
 */
export default async function InaccessibleProductDetailPage({
  params,
}: PageProps) {
  const { locale: raw, productSlug } = await params;
  if (!isLocale(raw)) return null;
  const locale: Locale = raw;

  const [dictionary, catalog] = await Promise.all([
    getDictionary(locale),
    getHomeCatalog(locale),
  ]);
  const product = getCatalogProductBySlug(catalog.products, productSlug);
  if (!product) notFound();

  const relatedProducts = getRelatedCatalogProducts(catalog.products, product);
  const { productDetail, productList } = dictionary.pages;
  const primaryImage = product.images[0];
  const categoryLabels = labelsFor(
    product.categories,
    productList.filters.categories as Record<string, string>,
  );
  const tagLabels = labelsFor(
    product.tags,
    productList.filters.tags as Record<string, string>,
  );
  const collectionLabels = labelsFor(
    product.collections,
    productList.filters.collections as Record<string, string>,
  );
  const isApparelProduct = product.categories.includes("apparel");

  return (
    <MainContent className="grid-template gap-y-fluid-xl py-fluid-lg">
      <div className="col-wide">
        <PLinkPure
          href={productsIndexHref(locale, INACCESSIBLE_ROUTE_PREFIX)}
          icon="arrow-left"
        >
          {productDetail.backToProducts}
        </PLinkPure>
      </div>

      <div className="col-wide grid grid-cols-subgrid">
        <div className="col-span-full md:col-span-one-half overflow-hidden rounded-2xl">
          {/* Intentional axe `image-alt` violation: <img> without alt */}
          {/* biome-ignore lint/a11y/useAltText: Intentional defect for inaccessible testing variant. */}
          <img
            className="aspect-3/4 h-auto w-full object-cover rounded-2xl"
            src={appHref(primaryImage?.src ?? "/home-product-keychain.jpg")}
          />
        </div>

        <div className="col-span-full md:col-start-11 flex flex-col gap-fluid-md">
          <ProductDetailWarningBanner
            copy={productDetail.infoBanner}
            showBanner={product.details.info ? true : false}
          />
          <div className="flex flex-wrap gap-static-sm">
            {productHasNewReleaseFlag(product) ? (
              <PTag compact key="new-release">
                {productList.newReleaseTag}
              </PTag>
            ) : null}
            {[...categoryLabels, ...collectionLabels, ...tagLabels].map(
              (label) => (
                <PTag compact key={label}>
                  {label}
                </PTag>
              ),
            )}
          </div>
          <div className="flex flex-col items-start gap-fluid-sm">
            {/* Intentional defect: styled <div> instead of <h1> */}
            <div className="prose-heading-3xl font-semibold">
              {product.name}
            </div>
            <PText className="inaccessible-low-contrast">
              {product.teaser}
            </PText>
          </div>
          <ProductDetailPrice copy={productList.pricing} product={product} />
          {isApparelProduct ? (
            <>
              <PDivider />
              <div className="flex flex-col items-start gap-static-sm">
                <PHeading size="md" tag="h5">
                  {productDetail.sizes}
                </PHeading>
                <ProductSizeSelector label={productDetail.selectSize} />
                <ProductSizeComparisonSheet
                  copy={productDetail.sizeComparison}
                />
              </div>
              <PDivider />
            </>
          ) : null}
          <div className="flex w-full flex-col items-start gap-fluid-md">
            <PHeading size="md" tag="h5">
              {productDetail.details}
            </PHeading>
            <ProductDetailSections
              copy={productDetail}
              locale={locale}
              product={product}
            />
          </div>
          <div className="flex flex-wrap gap-static-sm">
            <ProductInquiryFlyout
              copy={productDetail.inquiry}
              productImageAlt={primaryImage?.alt ?? ""}
              productImageSrc={appHref(
                primaryImage?.src ?? "/home-product-keychain.jpg",
              )}
              productName={product.name}
            />
            <ProductDetailFavoriteButton
              labelAdd={productDetail.favorites}
              labelRemove={productDetail.favoritesRemove}
              productSlug={product.slug}
            />
          </div>
        </div>
      </div>

      {relatedProducts.length > 0 ? (
        <>
          <div className="col-wide">
            <PHeading align="center" size="2xl" tag="h5">
              {productDetail.relatedProducts}
            </PHeading>
          </div>
          <CatalogProductGrid
            locale={locale}
            newReleaseTagLabel={productList.newReleaseTag}
            pricingCopy={productList.pricing}
            products={relatedProducts}
            sectionAriaLabel={productDetail.relatedProducts}
          />
        </>
      ) : null}
    </MainContent>
  );
}
