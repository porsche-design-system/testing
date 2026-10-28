import { ContactForm } from "@/app/components/inaccessible/contact/ContactForm";
import { isLocale, type Locale } from "@/app/i18n/config";
import { getDictionary } from "@/app/i18n/get-dictionary";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function InaccessibleContactPage({ params }: PageProps) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return null;
  const locale = raw as Locale;
  const dictionary = await getDictionary(locale);

  return <ContactForm copy={dictionary.pages.contact} />;
}
