import {
  PDivider,
  PFlag,
  PHeading,
  PLink,
  PLinkPure,
  PText,
  PWordmark,
} from "@porsche-design-system/components-react/ssr";
import type { Locale } from "@/app/i18n/config";
import type { Dictionary } from "@/app/i18n/get-dictionary";
import {
  appHref,
  contactHref,
  INACCESSIBLE_ROUTE_PREFIX,
  localeHomeHref,
  newsletterHref,
} from "@/app/i18n/href";
import { FooterLanguageChangeLink } from "./FooterLanguageChangeLink";

type Props = {
  dictionary: Dictionary;
  locale: Locale;
};

const SOCIAL_ICONS = [
  { icon: "logo-facebook", key: "facebook" as const },
  { icon: "logo-instagram", key: "instagram" as const },
  { icon: "logo-pinterest", key: "pinterest" as const },
  { icon: "logo-youtube", key: "youtube" as const },
  { icon: "logo-x", key: "x" as const },
  { icon: "logo-linkedin", key: "linkedin" as const },
] as const;

const footerFlagByLocale: Record<Locale, "us" | "de"> = {
  en: "us",
  de: "de",
};

/**
 * Intentional PDS & HTML accessibility defects:
 * - Generic `<div>` instead of `<footer>` and `<section>` / `<nav>` landmarks
 * - Social icon `PLink` components use `hideLabel={true}` with empty children and no `aria-label`
 * - Skipped heading levels (`tag="h5"` with `size="lg"`)
 * - Low-contrast text on legal disclaimer (`color-contrast`)
 */
export function GlobalFooter({ dictionary, locale }: Props) {
  const { footer } = dictionary;
  const homeHref = localeHomeHref(locale, INACCESSIBLE_ROUTE_PREFIX);
  const footerFlagName = footerFlagByLocale[locale];

  const companyEntries = [
    {
      href: appHref(`${INACCESSIBLE_ROUTE_PREFIX}/${locale}/company/glance/`),
      label: footer.companyLinks.glance,
    },
    {
      href: appHref(`${INACCESSIBLE_ROUTE_PREFIX}/${locale}/company/pcna/`),
      label: footer.companyLinks.na,
    },
    {
      href: appHref(
        `${INACCESSIBLE_ROUTE_PREFIX}/${locale}/company/sustainability/`,
      ),
      label: footer.companyLinks.sustainability,
    },
    {
      href: appHref(`${INACCESSIBLE_ROUTE_PREFIX}/${locale}/company/career/`),
      label: footer.companyLinks.career,
    },
    {
      href: appHref(`${INACCESSIBLE_ROUTE_PREFIX}/${locale}/company/press/`),
      label: footer.companyLinks.press,
    },
  ];

  return (
    <div
      className="grid-template bg-canvas py-fluid-lg scheme-dark"
      data-testid="global-footer"
    >
      <div className="col-wide flex flex-col gap-fluid-md">
        <div className="flex flex-col gap-fluid-sm">
          <PHeading size="lg" tag="h5" weight="semibold">
            {footer.regionTitle}
          </PHeading>
          <div className="flex flex-wrap items-center gap-fluid-xs">
            <PFlag className="shrink-0" name={footerFlagName} />
            <PText>{footer.regionMarket}</PText>
            <FooterLanguageChangeLink
              ariaLabelToDe={footer.changeLanguageAriaToDe}
              ariaLabelToEn={footer.changeLanguageAriaToEn}
              locale={locale}
              regionChange={footer.regionChange}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-fluid-xl md:grid-cols-3 md:gap-fluid-lg">
          <div className="flex max-w-prose flex-col gap-fluid-sm">
            <PHeading size="lg" tag="h5" weight="semibold">
              {footer.newsletterTitle}
            </PHeading>
            <PText>{footer.newsletterCopy}</PText>
            <PLink
              className="w-full max-w-md"
              href={newsletterHref(locale, INACCESSIBLE_ROUTE_PREFIX)}
              variant="secondary"
            >
              {footer.subscribe}
            </PLink>
          </div>

          <div className="flex max-w-prose flex-col gap-fluid-sm">
            <PHeading size="lg" tag="h5" weight="semibold">
              {footer.contactTitle}
            </PHeading>
            <PText>{footer.contactCopy}</PText>
            <PLink
              className="w-full max-w-md"
              href={contactHref(locale, INACCESSIBLE_ROUTE_PREFIX)}
              variant="secondary"
            >
              {footer.contactForm}
            </PLink>
          </div>

          <div className="flex max-w-prose flex-col gap-fluid-sm">
            <PHeading size="lg" tag="h5" weight="semibold">
              {footer.socialTitle}
            </PHeading>
            <PText>{footer.socialCopy}</PText>
            <div className="m-0 flex flex-wrap gap-static-xs p-0">
              {SOCIAL_ICONS.map(({ icon, key }) => (
                <span key={key}>
                  {/* Intentional PDS Don't: hideLabel=true with empty children and no aria-label */}
                  <PLink
                    hideLabel={true}
                    href={footer.socialUrls[key]}
                    icon={icon}
                  />
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-fluid-sm">
          <PHeading size="lg" tag="h5" weight="semibold">
            {footer.companyTitle}
          </PHeading>
          <div>
            <div className="grid grid-cols-1 gap-y-static-xs sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-fluid-xl">
              {companyEntries.map(({ href, label }) => (
                <div key={href}>
                  <PLinkPure href={href} icon="none">
                    {label}
                  </PLinkPure>
                </div>
              ))}
            </div>
          </div>
        </div>

        <PDivider className="my-fluid-xs" />

        <div className="flex flex-col gap-fluid-md">
          <div className="flex flex-col gap-static-sm">
            {/* Intentional WCAG 1.4.3 color-contrast failure on dark background */}
            <p className="text-sm text-[#4a4b4d]">{footer.legalCopyright}</p>
            <div className="flex flex-wrap gap-x-fluid-sm gap-y-static-xs">
              <PLinkPure
                href={appHref(
                  `${INACCESSIBLE_ROUTE_PREFIX}/${locale}/legal/notice/`,
                )}
                icon="none"
                size="sm"
                underline={true}
              >
                {footer.legalNotice}
              </PLinkPure>
              <PLinkPure
                href={appHref(
                  `${INACCESSIBLE_ROUTE_PREFIX}/${locale}/legal/icp/`,
                )}
                icon="none"
                size="sm"
                underline={true}
              >
                {footer.legalIcp}
              </PLinkPure>
              <PLinkPure
                href={appHref(
                  `${INACCESSIBLE_ROUTE_PREFIX}/${locale}/legal/environment/`,
                )}
                icon="none"
                size="sm"
                underline={true}
              >
                {footer.legalEnv}
              </PLinkPure>
            </div>
            <PLinkPure
              href={appHref(
                `${INACCESSIBLE_ROUTE_PREFIX}/${locale}/legal/security/`,
              )}
              icon="none"
              size="sm"
              underline={true}
            >
              {footer.legalSecurity}
            </PLinkPure>
            <p className="text-sm text-[#4a4b4d]">
              {footer.legalDisclaimer}{" "}
              <PLinkPure
                className="align-baseline"
                href={appHref(
                  `${INACCESSIBLE_ROUTE_PREFIX}/${locale}/legal/more/`,
                )}
                icon="none"
                size="sm"
                underline={true}
              >
                {footer.legalMoreInfo}
              </PLinkPure>
            </p>
          </div>

          <div className="flex flex-col items-center gap-fluid-md pt-fluid-sm">
            <PWordmark href={homeHref} size="small" />
          </div>
        </div>
      </div>
    </div>
  );
}
