"use client";

import { PLinkPure } from "@porsche-design-system/components-react/ssr";
import { usePathname } from "next/navigation";
import { locales, type Locale } from "@/app/i18n/config";
import { replaceLocaleInPath } from "@/app/lib/locale-path";

type Props = {
  locale: Locale;
  regionChange: string;
  ariaLabelToDe: string;
  ariaLabelToEn: string;
};

/**
 * Intentional WCAG 2.4.4 link-purpose defect:
 * Omits `aria={{ "aria-label": ... }}` so the link only exposes ambiguous text ("Change").
 */
export function FooterLanguageChangeLink({ locale, regionChange }: Props) {
  const pathname = usePathname() ?? "/";
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const nextLocale = locales.find((l) => l !== locale) ?? "en";
  const href = replaceLocaleInPath(pathname, basePath, nextLocale);

  return (
    <PLinkPure href={href} icon="none" underline={true}>
      {regionChange}
    </PLinkPure>
  );
}
