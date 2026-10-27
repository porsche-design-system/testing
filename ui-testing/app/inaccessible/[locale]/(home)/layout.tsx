import { GlobalHeader } from "@/app/components/inaccessible/header/GlobalHeader";
import { isLocale, type Locale } from "@/app/i18n/config";
import { getDictionary } from "@/app/i18n/get-dictionary";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function InaccessibleHomeLayout({
  children,
  params,
}: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return null;
  const locale: Locale = raw;
  const dictionary = await getDictionary(locale);

  return (
    <>
      <GlobalHeader dictionary={dictionary} heroOverlay locale={locale} />
      {children}
    </>
  );
}
