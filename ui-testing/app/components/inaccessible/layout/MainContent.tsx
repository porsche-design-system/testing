import { PageFeedback } from "@/app/components/inaccessible/feedback/PageFeedback";

type Props = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Intentional WCAG 1.3.1 / landmark failure: uses a generic `<div>` instead of `<main>`.
 * Also includes an empty `<h2>` node (`empty-heading` violation) and duplicate IDs (`duplicate-id`).
 */
export function MainContent({ children, className }: Props) {
  return (
    <div className={className} data-testid="main-content">
      {/* Intentional axe-core `empty-heading` & `duplicate-id` violations */}
      <h2 className="sr-only" id="duplicate-section-id" />
      <span className="hidden" id="duplicate-section-id" />
      {children}
      <PageFeedback />
    </div>
  );
}
