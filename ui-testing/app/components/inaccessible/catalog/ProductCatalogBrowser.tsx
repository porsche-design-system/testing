"use client";

import {
  type CSSProperties,
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  PAccordion,
  PButton,
  PCheckbox,
  PFlyout,
  PHeading,
  PIcon,
  PInlineNotification,
  PSelect,
  PSelectOption,
  PTabsBar,
  PText,
} from "@porsche-design-system/components-react/ssr";
import { useProductFavorites } from "@/app/components/shared/favorites/ProductFavoritesProvider";
import { CatalogProductGrid } from "@/app/components/inaccessible/catalog/CatalogProductGrid";
import {
  type AudienceSlug,
  audienceSlugs,
  type CategorySlug,
  categorySlugs,
  type CollectionSlug,
  collectionSlugs,
  isAudienceSlug,
  isCategorySlug,
  isCollectionSlug,
  isLifestyleTagSlug,
  isMerchandisingFlagSlug,
  type LifestyleTagSlug,
  lifestyleTagSlugs,
  type MerchandisingFlagSlug,
  merchandisingFlagSlugs,
} from "@/app/data/catalog/taxonomy";
import {
  type CatalogFacetFilter,
  type CatalogProduct,
  filterCatalogProducts,
} from "@/app/data/get-catalog";
import { useCatalogQueryParams } from "@/app/hooks/use-catalog-query-params";
import type { Locale } from "@/app/i18n/config";
import type { Dictionary } from "@/app/i18n/get-dictionary";
import { PRODUCTS_FAVORITES_QUERY } from "@/app/i18n/href";
import {
  areSameFacetValues,
  buildCatalogFilterFromParams,
  formatCatalogCount,
  isFacetValueSelected,
  isFavoritesOnlyQuery,
  parseFacetValues,
} from "@/app/lib/catalog-query";
import {
  type CatalogSortKey,
  getCatalogSortKey,
  sortCatalogProducts,
} from "@/app/lib/catalog-sort";

type ProductListCopy = Dictionary["pages"]["productList"];

type Props = {
  copy: ProductListCopy;
  locale: Locale;
  products: CatalogProduct[];
};

type FacetDefinition<T extends string> = {
  key: keyof CatalogFacetFilter;
  param: string;
  legend: string;
  values: readonly T[];
  labels: Record<string, string>;
  isValid: (value: string) => value is T;
};

type QuickFilterDefinition = {
  label: string;
  filter: Pick<CatalogFacetFilter, "audiences" | "categories" | "collections">;
};

/**
 * Intentional PDS & Tailwind accessibility defects:
 * - Generic `<div>` instead of `<section aria-label>`
 * - Result count omits `aria-live="polite"`
 * - `PSelect` uses `hideLabel={true}` and `label=""` (no accessible name)
 * - Active filter dismiss chips rendered as mouse-only `<div onClick>` (no button role, no tabIndex, no keyboard handler)
 * - `PFlyout` omits `aria={{ "aria-label": ... }}`
 * - `PCheckbox` uses `hideLabel={true}` and `label=""` with unlinked visual `<span>` label
 * - Empty state omits `role="status"`
 * - aria-haspopup directly on host element of p-button (which has no effect)
 */
export function ProductCatalogBrowser({ copy, locale, products }: Props) {
  const { params, replaceParams } = useCatalogQueryParams();
  const { favoriteSlugs, isFavorite } = useProductFavorites();
  const [isFilterFlyoutOpen, setIsFilterFlyoutOpen] = useState(false);
  const [openFacets, setOpenFacets] = useState<Record<string, boolean>>({
    audiences: true,
    categories: false,
    collections: false,
    flags: false,
    tags: false,
  });

  const filter = useMemo(() => buildCatalogFilterFromParams(params), [params]);
  const sortKey = getCatalogSortKey(params);
  const favoritesOnly = isFavoritesOnlyQuery(params);
  const filteredProducts = useMemo(
    () => filterCatalogProducts(products, filter),
    [filter, products],
  );
  const sortedProducts = useMemo(
    () => sortCatalogProducts(filteredProducts, sortKey),
    [filteredProducts, sortKey],
  );
  const displayProducts = useMemo(() => {
    if (!favoritesOnly) return sortedProducts;
    return sortedProducts.filter((p) => isFavorite(p.slug));
  }, [favoritesOnly, isFavorite, sortedProducts]);

  const facets = useMemo(
    () =>
      [
        {
          key: "audiences",
          param: "audience",
          legend: copy.filters.audience,
          values: audienceSlugs,
          labels: copy.filters.audiences as Record<string, string>,
          isValid: isAudienceSlug,
        },
        {
          key: "categories",
          param: "category",
          legend: copy.filters.category,
          values: categorySlugs,
          labels: copy.filters.categories as Record<string, string>,
          isValid: isCategorySlug,
        },
        {
          key: "collections",
          param: "collection",
          legend: copy.filters.collection,
          values: collectionSlugs,
          labels: copy.filters.collections as Record<string, string>,
          isValid: isCollectionSlug,
        },
        {
          key: "flags",
          param: "flag",
          legend: copy.filters.flag,
          values: merchandisingFlagSlugs,
          labels: copy.filters.flags as Record<string, string>,
          isValid: isMerchandisingFlagSlug,
        },
        {
          key: "tags",
          param: "tag",
          legend: copy.filters.tag,
          values: lifestyleTagSlugs,
          labels: copy.filters.tags as Record<string, string>,
          isValid: isLifestyleTagSlug,
        },
      ] satisfies [
        FacetDefinition<AudienceSlug>,
        FacetDefinition<CategorySlug>,
        FacetDefinition<CollectionSlug>,
        FacetDefinition<MerchandisingFlagSlug>,
        FacetDefinition<LifestyleTagSlug>,
      ],
    [copy],
  );

  const quickFilters = useMemo(
    () =>
      [
        {
          label: copy.quickFilters.all,
          filter: {},
        },
        {
          label: copy.quickFilters.womenApparel,
          filter: { audiences: ["women"], categories: ["apparel"] },
        },
        {
          label: copy.quickFilters.menApparel,
          filter: { audiences: ["men"], categories: ["apparel"] },
        },
        {
          label: copy.quickFilters.kidsApparel,
          filter: { audiences: ["kids"], categories: ["apparel"] },
        },
        {
          label: copy.quickFilters.porscheDesign,
          filter: { collections: ["porsche-design"] },
        },
      ] satisfies QuickFilterDefinition[],
    [copy],
  );

  const activeFilters = facets.flatMap((facet) => {
    const selectedValues = filter[facet.key] ?? [];
    return selectedValues.map((value) => ({
      facet,
      value,
      label: facet.labels[value],
    }));
  });

  const updateFacet = useCallback(
    <T extends string>(
      facet: FacetDefinition<T>,
      value: T,
      checked: boolean,
    ) => {
      const next = new URLSearchParams(params.toString());
      next.delete("reduced");
      const selected = parseFacetValues(next, facet.param, facet.isValid);
      const nextValues = checked
        ? Array.from(new Set([...selected, value]))
        : selected.filter((selectedValue) => selectedValue !== value);

      if (nextValues.length > 0) {
        next.set(facet.param, nextValues.join(","));
      } else {
        next.delete(facet.param);
      }

      replaceParams(next);
    },
    [params, replaceParams],
  );

  const applyQuickFilter = useCallback(
    (quickFilter: QuickFilterDefinition) => {
      const next = new URLSearchParams();
      next.delete(PRODUCTS_FAVORITES_QUERY);
      next.delete("reduced");

      if (quickFilter.filter.audiences?.length) {
        next.set("audience", quickFilter.filter.audiences.join(","));
      }
      if (quickFilter.filter.categories?.length) {
        next.set("category", quickFilter.filter.categories.join(","));
      }
      if (quickFilter.filter.collections?.length) {
        next.set("collection", quickFilter.filter.collections.join(","));
      }

      replaceParams(next);
    },
    [replaceParams],
  );

  const updateSort = useCallback(
    (nextSortKey: CatalogSortKey) => {
      const next = new URLSearchParams(params.toString());

      if (nextSortKey === "recommended") {
        next.delete("sort");
      } else {
        next.set("sort", nextSortKey);
      }

      replaceParams(next);
    },
    [params, replaceParams],
  );

  const clearFilters = useCallback(() => {
    const next = new URLSearchParams(params.toString());
    next.delete("audience");
    next.delete("category");
    next.delete("collection");
    next.delete("flag");
    next.delete("tag");
    next.delete(PRODUCTS_FAVORITES_QUERY);
    next.delete("reduced");
    replaceParams(next);
  }, [params, replaceParams]);

  const clearFavoritesOnly = useCallback(() => {
    const next = new URLSearchParams(params.toString());
    next.delete(PRODUCTS_FAVORITES_QUERY);
    replaceParams(next);
  }, [params, replaceParams]);

  function toggleFacetPanel(facetKey: keyof CatalogFacetFilter, open: boolean) {
    setOpenFacets((current) => ({ ...current, [facetKey]: open }));
  }

  const activeQuickFilterIndex = quickFilters.findIndex(
    ({ filter: quickFilter }) => {
      return (
        areSameFacetValues(filter.audiences, quickFilter.audiences) &&
        areSameFacetValues(filter.categories, quickFilter.categories) &&
        areSameFacetValues(filter.collections, quickFilter.collections)
      );
    },
  );

  const resultCountLabel = formatCatalogCount(
    copy.resultCount,
    displayProducts.length,
  );
  const showProductsLabel = formatCatalogCount(
    copy.showProducts,
    displayProducts.length,
  );

  const emptyNoFavoritesSaved =
    favoritesOnly && favoriteSlugs.length === 0 && displayProducts.length === 0;
  const emptyTitleCopy = emptyNoFavoritesSaved
    ? copy.favoritesEmptyTitle
    : copy.emptyTitle;
  const emptyTextCopy = emptyNoFavoritesSaved
    ? copy.favoritesEmptyText
    : copy.emptyText;

  return (
    <>
      <div className="col-basic grid">
        <div className="flex justify-center mt-fluid-md">
          <PTabsBar
            activeTabIndex={
              activeQuickFilterIndex >= 0 ? activeQuickFilterIndex : undefined
            }
            onUpdate={(event) => {
              const quickFilter = quickFilters[event.detail.activeTabIndex];
              if (quickFilter) applyQuickFilter(quickFilter);
            }}
          >
            {quickFilters.map((quickFilter) => (
              <button key={quickFilter.label} type="button">
                {quickFilter.label}
              </button>
            ))}
          </PTabsBar>
        </div>

        <div className="flex flex-col gap-fluid-sm md:flex-row md:items-end md:justify-between mt-fluid-lg">
          <div className="flex flex-wrap items-center gap-static-md">
            <PButton
              data-testid="filter-flyout-trigger"
              icon="adjust"
              onClick={() => setIsFilterFlyoutOpen(true)}
              type="button"
              aria-haspopup="dialog"
            >
              {copy.filterButtonLabel}
            </PButton>
            {/* Intentional defect: no aria-live="polite" and low-contrast text */}
            <PText className="inaccessible-low-contrast">
              {resultCountLabel}
            </PText>
          </div>
          <div className="w-full md:w-[240px]">
            <div className="mb-static-xxs text-sm">{copy.sort.label}</div>
            {/* Intentional PDS Don't: PSelect with hideLabel=true and empty label */}
            <PSelect
              hideLabel={true}
              label=""
              name="sort"
              onChange={(event) =>
                updateSort(event.detail.value as CatalogSortKey)
              }
              value={sortKey}
            >
              <PSelectOption value="recommended">
                {copy.sort.recommended}
              </PSelectOption>
              <PSelectOption value="price-asc">
                {copy.sort.priceAsc}
              </PSelectOption>
              <PSelectOption value="price-desc">
                {copy.sort.priceDesc}
              </PSelectOption>
              <PSelectOption value="name-asc">
                {copy.sort.nameAsc}
              </PSelectOption>
            </PSelect>
          </div>
        </div>

        {activeFilters.length > 0 || favoritesOnly ? (
          <div className="flex flex-wrap items-center gap-static-sm mt-fluid-md">
            {favoritesOnly ? (
              <div
                className="inline-flex cursor-pointer items-center gap-static-xs rounded-sm bg-contrast-low px-static-sm py-static-xxs text-xs select-none"
                data-testid="dismiss-favorites-chip"
                onClick={clearFavoritesOnly}
              >
                <span>{copy.favoritesOnlyLabel}</span>
                <span>×</span>
              </div>
            ) : null}
            {activeFilters.map(({ facet, label, value }) => (
              /* Intentional WCAG 2.1.1 / 4.1.2 defect: mouse-only <div onClick> filter chip */
              <div
                className="inline-flex cursor-pointer items-center gap-static-xs rounded-sm bg-contrast-low px-static-sm py-static-xxs text-xs select-none"
                data-testid={`dismiss-filter-${facet.param}-${value}`}
                key={`${facet.param}-${value}`}
                onClick={() => updateFacet(facet, value, false)}
              >
                <span>{label}</span>
                <span>×</span>
              </div>
            ))}
            <PButton
              compact
              icon="delete"
              onClick={clearFilters}
              type="button"
              variant="secondary"
            >
              {copy.clearFilters}
            </PButton>
          </div>
        ) : null}
      </div>

      {/* Intentional PDS Don't: PFlyout without aria-label */}
      <PFlyout
        backdrop="shading"
        background="surface"
        footerBehavior="fixed"
        onDismiss={() => setIsFilterFlyoutOpen(false)}
        open={isFilterFlyoutOpen}
        style={
          {
            "--p-flyout-width": "500px",
          } as CSSProperties
        }
      >
        <div className="grid gap-static-lg">
          <div className="flex items-center gap-static-sm" slot="header">
            <PIcon name="adjust" size="md" />
            <PHeading size="lg" tag="h5">
              {copy.filterButtonLabel}
            </PHeading>
          </div>

          <div className="flex flex-col gap-static-sm">
            {isFilterFlyoutOpen
              ? facets.map((facet) => (
                  <PAccordion
                    alignMarker="end"
                    background="canvas"
                    key={facet.param}
                    onUpdate={(event) =>
                      toggleFacetPanel(facet.key, event.detail.open)
                    }
                    open={openFacets[facet.key]}
                  >
                    <span slot="summary">{facet.legend}</span>
                    <div className="flex flex-col gap-static-sm">
                      {facet.values.map((value) => {
                        const selected = isFacetValueSelected(
                          filter[facet.key],
                          value,
                        );

                        return (
                          <div
                            className="flex items-center gap-static-xs"
                            key={value}
                          >
                            {/* Intentional PDS Don't: PCheckbox with hideLabel=true and empty label */}
                            <PCheckbox
                              checked={selected}
                              hideLabel={true}
                              label=""
                              name={facet.param}
                              onChange={() =>
                                updateFacet(facet, value, !selected)
                              }
                              value={value}
                            />
                            <span
                              className="cursor-pointer text-sm"
                              onClick={() =>
                                updateFacet(facet, value, !selected)
                              }
                            >
                              {facet.labels[value]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </PAccordion>
                ))
              : null}
          </div>
        </div>

        <div className="flex gap-static-sm" slot="footer">
          <PButton onClick={() => setIsFilterFlyoutOpen(false)} type="button">
            {showProductsLabel}
          </PButton>
          {activeFilters.length > 0 || favoritesOnly ? (
            <PButton onClick={clearFilters} type="button" variant="secondary">
              {copy.clearFilters}
            </PButton>
          ) : null}
        </div>
      </PFlyout>

      {displayProducts.length > 0 ? (
        <CatalogProductGrid
          locale={locale}
          newReleaseTagLabel={copy.newReleaseTag}
          pricingCopy={copy.pricing}
          products={displayProducts}
          sectionAriaLabel={copy.productsRegionLabel}
        />
      ) : null}
      {/* Intentional defect: omit role="status" on empty state */}
      <div className="col-basic grid gap-fluid-sm empty:hidden">
        {displayProducts.length === 0 ? (
          <PInlineNotification
            description={emptyTextCopy}
            dismissButton={false}
            heading={emptyTitleCopy}
            headingTag="h5"
            state="info"
          />
        ) : null}
      </div>
    </>
  );
}
