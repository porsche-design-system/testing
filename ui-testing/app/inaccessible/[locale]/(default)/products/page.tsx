import { ProductsIndexContent } from "@/app/components/inaccessible/catalog/ProductsIndexContent";
import { getHomeCatalog } from "@/app/data/get-catalog";
import { isLocale, type Locale } from "@/app/i18n/config";
import { getDictionary } from "@/app/i18n/get-dictionary";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function InaccessibleProductsIndexPage({
  params,
}: PageProps) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return null;
  const locale = raw as Locale;

  const [dictionary, catalog] = await Promise.all([
    getDictionary(locale),
    getHomeCatalog(locale),
  ]);

  const { productList } = dictionary.pages;

  return (
    <ProductsIndexContent
      copy={productList}
      locale={locale}
      products={catalog.products}
    />
  );
}
