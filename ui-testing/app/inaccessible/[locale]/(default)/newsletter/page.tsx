import { NewsletterSubscriptionForm } from "@/app/components/inaccessible/newsletter/NewsletterSubscriptionForm";
import { isLocale, type Locale } from "@/app/i18n/config";
import { getDictionary } from "@/app/i18n/get-dictionary";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function InaccessibleNewsletterPage({
  params,
}: PageProps) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return null;
  const locale = raw as Locale;
  const dictionary = await getDictionary(locale);

  return <NewsletterSubscriptionForm copy={dictionary.pages.newsletter} />;
}
