import { HomeHero } from "@/app/components/inaccessible/home/HomeHero";
import { HomeLandingContent } from "@/app/components/inaccessible/home/HomeLandingContent";
import { MainContent } from "@/app/components/inaccessible/layout/MainContent";
import { filterCatalogProducts, getHomeCatalog } from "@/app/data/get-catalog";
import { isLocale, type Locale } from "@/app/i18n/config";
import { getDictionary } from "@/app/i18n/get-dictionary";
import { INACCESSIBLE_ROUTE_PREFIX, productsIndexHref } from "@/app/i18n/href";

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function InaccessibleHomePage({ params }: HomePageProps) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return null;
  const locale = raw as Locale;
  const [dictionary, catalog] = await Promise.all([
    getDictionary(locale),
    getHomeCatalog(locale),
  ]);
  const { home } = dictionary.pages;
  const trendingProducts = filterCatalogProducts(catalog.products, {
    flags: ["trending"],
  });

  return (
    <MainContent className="relative z-0 grid-template gap-y-0">
      <HomeHero
        alt={home.teaserAlt}
        ctaLabel={home.heroCta}
        heading={home.heroHeading}
        locale={locale}
        modal={home.heroModal}
        productsHref={productsIndexHref(locale, INACCESSIBLE_ROUTE_PREFIX)}
      />
      <HomeLandingContent
        home={home}
        locale={locale}
        tilePricingCopy={dictionary.pages.productList.pricing}
        trendingProducts={trendingProducts}
      />
    </MainContent>
  );
}
