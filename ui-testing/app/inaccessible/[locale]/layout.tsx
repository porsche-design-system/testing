import {
  getComponentChunkLinks,
  getFontLinks,
  getIconLinks,
  getMetaTagsAndIconLinks,
} from "@porsche-design-system/components-react/partials";
import { PorscheDesignSystemProvider } from "@porsche-design-system/components-react/ssr";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { ProductFavoritesProvider } from "@/app/components/favorites/ProductFavoritesProvider";
import { FeedbackCopyProvider } from "@/app/components/feedback/FeedbackCopyContext";
import { ProductFavoriteToasts } from "@/app/components/inaccessible/favorites/ProductFavoriteToasts";
import { GlobalFooter } from "@/app/components/inaccessible/footer/GlobalFooter";
import { isLocale, type Locale, locales } from "@/app/i18n/config";
import { getDictionary } from "@/app/i18n/get-dictionary";
import "@/app/globals.css";

const APP_TITLE = "Shop";

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

/**
 * Intentional WCAG 1.4.4 violation (`meta-viewport`): disables pinch-to-zoom.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

/**
 * Intentional WCAG 2.4.2 failure: generic static page title across all routes.
 */
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: APP_TITLE,
  };
}

export default async function InaccessibleLocaleRootLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dictionary = await getDictionary(locale);

  return (
    /* Intentional WCAG 3.1.1 violation (`html-has-lang`): omit `lang` attribute on <html> */
    <html className="scheme-light-dark inaccessible-app">
      <head>
        <base
          href={
            process.env.NEXT_PUBLIC_BASE_PATH
              ? `${process.env.NEXT_PUBLIC_BASE_PATH}/`
              : "/"
          }
        />
        {getFontLinks({ format: "jsx" })}
        {getComponentChunkLinks({ format: "jsx" })}
        {getIconLinks({ format: "jsx" })}
        {getMetaTagsAndIconLinks({ appTitle: APP_TITLE, format: "jsx" })}
      </head>
      <body>
        {/* Intentional defect: omit <RouteFocus /> so SPA navigation does not manage focus */}
        <PorscheDesignSystemProvider>
          <FeedbackCopyProvider copy={dictionary.feedback}>
            <ProductFavoritesProvider>
              {children}
              <ProductFavoriteToasts
                copy={{
                  added: dictionary.header.favoritesToastAdded,
                  removed: dictionary.header.favoritesToastRemoved,
                }}
              />
            </ProductFavoritesProvider>
          </FeedbackCopyProvider>
          <GlobalFooter dictionary={dictionary} locale={locale} />
        </PorscheDesignSystemProvider>
      </body>
    </html>
  );
}
