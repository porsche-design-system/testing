import { PText } from "@porsche-design-system/components-react/ssr";
import { MainContent } from "@/app/components/inaccessible/layout/MainContent";

type Props = {
  title: string;
  notice: string;
};

/**
 * Intentional defects:
 * - Page heading rendered as a styled `<div>` instead of `<h1>` (`page-has-heading-one`)
 * - Low contrast notice text (`color-contrast`)
 * - Includes an unalt'd decorative image (`image-alt`)
 */
export function FooterDummyPage({ title, notice }: Props) {
  return (
    <MainContent className="grid-template py-fluid-lg">
      <div className="col-wide flex max-w-prose flex-col gap-fluid-sm">
        <div className="prose-heading-xl font-semibold">{title}</div>
        <PText className="inaccessible-low-contrast" color="inherit">
          {notice}
        </PText>
        {/* Intentional axe `image-alt` violation */}
        {/* biome-ignore lint/a11y/useAltText: Intentional defect for inaccessible testing variant. */}
        <img
          className="h-1 w-1 opacity-10"
          src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
        />
      </div>
    </MainContent>
  );
}
