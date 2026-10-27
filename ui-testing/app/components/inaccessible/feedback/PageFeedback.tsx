"use client";

import {
  PButton,
  PHeading,
  PSegmentedControl,
  PSegmentedControlItem,
  PText,
  PTextarea,
} from "@porsche-design-system/components-react/ssr";
import { useEffect, useRef, useState } from "react";
import { useFeedbackCopy } from "@/app/components/feedback/FeedbackCopyContext";
import { pdsStringValue } from "@/app/lib/product-inquiry";

type Phase = "form" | "thanks";

const RATING_OPTIONS = [
  { value: "1" },
  { value: "2" },
  { value: "3" },
  { value: "4" },
  { value: "5" },
] as const;

/**
 * Intentional PDS & WCAG defects:
 * - Generic `<div>` instead of `<section aria-label>`
 * - `PHeading` uses `tag="h5"` with `size="md"` (skipped heading level)
 * - `PSegmentedControl` uses `hideLabel={true}` and `label=""` (no accessible group label)
 * - Rating items omit screen-reader descriptions (`1`–`5` only)
 * - `PTextarea` uses `hideLabel={true}` and `label=""`
 * - Thank-you state omits `aria-live="polite"` and does not move focus on phase transition
 */
export function PageFeedback() {
  const copy = useFeedbackCopy();
  const [phase, setPhase] = useState<Phase>("form");
  const [rating, setRating] = useState("");
  const [comment, setComment] = useState("");
  const [hasRated, setHasRated] = useState(false);
  const [loading, setLoading] = useState(false);
  const submitTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (submitTimeoutRef.current !== null) {
        window.clearTimeout(submitTimeoutRef.current);
      }
    };
  }, []);

  const revealCommentAndSubmit = (value: string) => {
    setRating(value);
    setHasRated(true);
  };

  const showConfirmation = () => {
    submitTimeoutRef.current = null;
    setLoading(false);
    setPhase("thanks");
  };

  const submitFeedback = () => {
    setLoading(true);
    submitTimeoutRef.current = window.setTimeout(showConfirmation, 1200);
  };

  const restartFeedback = () => {
    if (submitTimeoutRef.current !== null) {
      window.clearTimeout(submitTimeoutRef.current);
      submitTimeoutRef.current = null;
    }
    setRating("");
    setComment("");
    setLoading(false);
    setHasRated(false);
    setPhase("form");
  };

  return (
    <div
      className="col-full mt-fluid-xl grid grid-cols-subgrid justify-items-center bg-surface py-fluid-lg"
      data-testid="page-feedback"
    >
      <div className="col-extended grid max-w-prose justify-items-center gap-fluid-md">
        <PHeading
          align="center"
          hidden={phase !== "form"}
          id="feedback-question"
          size="md"
          tag="h5"
        >
          {copy.question}
        </PHeading>

        <div
          className="grid w-full justify-items-center gap-fluid-md"
          hidden={phase !== "form"}
          id="feedback-form"
        >
          <div className="grid w-full items-center gap-static-md md:grid-cols-[auto_minmax(320px,1fr)_auto]">
            <PText
              align="start"
              className="col-1 row-2 justify-self-start max-sm:hidden md:col-auto md:row-auto inaccessible-low-contrast"
              size="small"
            >
              {copy.scaleStart}
            </PText>
            <PSegmentedControl
              className="col-span-2 row-1 md:col-auto md:row-auto"
              columns={{ base: 1, s: 5 }}
              hideLabel={true}
              id="feedback-rating"
              label=""
              name="feedback-rating"
              onChange={(event) =>
                revealCommentAndSubmit(pdsStringValue(event))
              }
              value={rating || undefined}
            >
              {RATING_OPTIONS.map(({ value }) => (
                <PSegmentedControlItem key={value} value={value}>
                  {value}
                </PSegmentedControlItem>
              ))}
            </PSegmentedControl>
            <PText
              align="end"
              className="col-2 row-2 justify-self-end max-sm:hidden md:col-auto md:row-auto inaccessible-low-contrast"
              size="small"
            >
              {copy.scaleEnd}
            </PText>
          </div>
          {hasRated ? (
            <div className="w-full">
              <div className="mb-static-xs text-sm">{copy.commentLabel}</div>
              <PTextarea
                className="w-full"
                hideLabel={true}
                id="feedback-comment"
                label=""
                name="comment"
                onChange={(event) => setComment(pdsStringValue(event))}
                onInput={(event) => setComment(pdsStringValue(event))}
                rows={4}
                value={comment}
              />
            </div>
          ) : null}
          <PButton
            hidden={!hasRated}
            id="feedback-submit"
            loading={loading}
            onClick={submitFeedback}
            type="button"
          >
            {copy.submit}
          </PButton>
        </div>

        {/* Intentional defect: omit aria-live="polite" and focus management */}
        <div
          className="grid w-full justify-items-center gap-fluid-md"
          hidden={phase !== "thanks"}
          id="feedback-thanks"
        >
          <PHeading align="center" id="feedback-thanks-heading" size="md" tag="h5">
            {copy.thanksHeading}
          </PHeading>
          <PText align="center">{copy.thanksCopy}</PText>
          <PButton
            icon="refresh"
            id="feedback-restart"
            onClick={restartFeedback}
            type="button"
            variant="secondary"
          >
            {copy.restart}
          </PButton>
        </div>
      </div>
    </div>
  );
}
