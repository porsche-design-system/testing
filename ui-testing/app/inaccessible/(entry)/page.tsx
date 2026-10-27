import { redirect } from "next/navigation";
import { defaultLocale } from "@/app/i18n/config";
import { INACCESSIBLE_ROUTE_PREFIX } from "@/app/i18n/href";

/**
 * Inaccessible variant root entry: redirects to `/inaccessible/en/`.
 */
export default function InaccessibleEntryRedirect(): never {
  redirect(`${INACCESSIBLE_ROUTE_PREFIX}/${defaultLocale}/`);
}
