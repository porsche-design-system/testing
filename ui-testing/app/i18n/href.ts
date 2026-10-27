import type { CatalogFacetFilter } from '@/app/data/get-catalog';
import type { Locale } from './config';

function normalizeBasePath(): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  return base.endsWith('/') && base.length > 1 ? base.slice(0, -1) : base;
}

/**
 * Absolute app path (must start with `/`). Prepends `NEXT_PUBLIC_BASE_PATH` when set.
 *
 * Use for **routes** and for **`public/` assets** referenced from raw `<img src>` (or
 * PDS slots). Do **not** use `./` for public files on locale routes (`/en/…`): the
 * browser resolves `./` against the **document URL**, so `./hero.jpg` becomes
 * `/en/hero.jpg` (404). Prefer `appHref('/hero.jpg')` instead of relying on `<base>`.
 */
export function appHref(path: string): string {
  const normalizedBase = normalizeBasePath();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

export const INACCESSIBLE_ROUTE_PREFIX = '/inaccessible';

export function localeHomeHref(locale: Locale, routePrefix = ''): string {
  return appHref(`${routePrefix}/${locale}/`);
}

/** Full product catalog index (`/[locale]/products/`). */
export function productsIndexHref(locale: Locale, routePrefix = ''): string {
  return appHref(`${routePrefix}/${locale}/products/`);
}

/** Query flag on `productsIndexHref` to show only session-saved favorites (`?favorites=1`). */
export const PRODUCTS_FAVORITES_QUERY = 'favorites';
export const PRODUCTS_FAVORITES_VALUE = '1';

/** Full product catalog index filtered to favorited products (session). */
export function productsFavoritesHref(locale: Locale, routePrefix = ''): string {
  const base = productsIndexHref(locale, routePrefix);
  const params = new URLSearchParams();
  params.set(PRODUCTS_FAVORITES_QUERY, PRODUCTS_FAVORITES_VALUE);
  return `${base}?${params.toString()}`;
}

export function productDetailHref(locale: Locale, slug: string, routePrefix = ''): string {
  return appHref(`${routePrefix}/${locale}/products/${slug}/`);
}

/** Newsletter subscription form (`/[locale]/newsletter/`). */
export function newsletterHref(locale: Locale, routePrefix = ''): string {
  return appHref(`${routePrefix}/${locale}/newsletter/`);
}

/** Contact form (`/[locale]/contact/`). */
export function contactHref(locale: Locale, routePrefix = ''): string {
  return appHref(`${routePrefix}/${locale}/contact/`);
}

export function productsFilterHref(
  locale: Locale,
  filter: CatalogFacetFilter,
  routePrefix = ''
): string {
  const params = new URLSearchParams();
  if (filter.audiences?.length) params.set('audience', filter.audiences.join(','));
  if (filter.categories?.length) params.set('category', filter.categories.join(','));
  if (filter.collections?.length) {
    params.set('collection', filter.collections.join(','));
  }
  if (filter.flags?.length) params.set('flag', filter.flags.join(','));
  if (filter.tags?.length) params.set('tag', filter.tags.join(','));
  const query = params.toString();
  return `${productsIndexHref(locale, routePrefix)}${query ? `?${query}` : ''}`;
}
