"use client";

import {
  PButton,
  PCheckbox,
  PInlineNotification,
  PInputEmail,
  PInputText,
  PPopover,
  PSpinner,
  PText,
  PTextarea,
} from "@porsche-design-system/components-react/ssr";
import { useCallback, useEffect, useState } from "react";
import type { ContactFormCopy } from "@/app/components/contact/ContactForm";
import { MainContent } from "@/app/components/inaccessible/layout/MainContent";
import {
  type ContactFieldErrorKey,
  type ContactFieldErrors,
  createInitialContactFormState,
  hasContactValidationErrors,
  pdsCheckboxChecked,
  pdsStringValue,
  validateContactForm,
} from "@/app/lib/contact-form";

type Props = {
  copy: ContactFormCopy;
};

type PostSubmitPhase = "idle" | "pending" | "done";

/**
 * Intentional PDS & WCAG defects:
 * - Page heading rendered as a styled `<div>` instead of `<h1>` (`page-has-heading-one`)
 * - Omits `<PFieldset>` grouping
 * - `PInputText`, `PInputEmail`, `PTextarea`, `PCheckbox` use `hideLabel={true}` and `label=""` with unlinked visual `<div>` labels
 * - omits `autoComplete` attributes (WCAG 1.3.5)
 * - Validation errors rendered as unlinked red `<div>` text (no `state="error"`, no `message` prop, no focus on first error)
 * - `PSpinner` omits `aria-label`; pending & done states omit `role="status"` and `aria-live`
 */
export function ContactForm({ copy }: Props) {
  const [form, setForm] = useState(createInitialContactFormState);
  const [errors, setErrors] = useState<ContactFieldErrors>({});
  const [postSubmitPhase, setPostSubmitPhase] =
    useState<PostSubmitPhase>("idle");

  const clearError = useCallback((key: ContactFieldErrorKey) => {
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  useEffect(() => {
    if (postSubmitPhase !== "pending") return;
    const id = window.setTimeout(() => {
      setPostSubmitPhase("done");
    }, 5000);
    return () => window.clearTimeout(id);
  }, [postSubmitPhase]);

  const handleSubmit = useCallback(() => {
    const next = validateContactForm(form, copy.errors);
    setErrors(next);
    if (hasContactValidationErrors(next)) {
      return;
    }
    setErrors({});
    setPostSubmitPhase("pending");
  }, [form, copy.errors]);

  const handleReset = useCallback(() => {
    setForm(createInitialContactFormState());
    setErrors({});
    setPostSubmitPhase("idle");
  }, []);

  return (
    <MainContent className="grid-template py-fluid-lg">
      <div className="col-wide flex max-w-prose flex-col gap-fluid-md">
        <div className="flex flex-col gap-fluid-sm">
          {/* Intentional defect: styled <div> instead of <h1> */}
          <div className="prose-heading-xl font-semibold">{copy.title}</div>
          <PText className="inaccessible-low-contrast">{copy.intro}</PText>
          {/* Intentional axe `image-alt` violation */}
          {/* biome-ignore lint/a11y/useAltText: Intentional defect for inaccessible testing variant. */}
          <img
            className="h-1 w-1 opacity-10"
            src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
          />
        </div>

        {postSubmitPhase === "done" ? (
          <div className="grid gap-fluid-md">
            <PInlineNotification
              description={copy.successDescription}
              dismissButton={false}
              heading={copy.successHeading}
              state="success"
            />
            <PButton onClick={handleReset} type="button" variant="secondary">
              {copy.sendAnother}
            </PButton>
          </div>
        ) : postSubmitPhase === "pending" ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-static-md py-fluid-lg">
            <PSpinner size="lg" />
            <PText className="inaccessible-low-contrast" size="sm">
              {copy.submittingHint}
            </PText>
          </div>
        ) : (
          <form
            className="grid gap-fluid-md"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              handleSubmit();
            }}
          >
            {hasContactValidationErrors(errors) ? (
              <PInlineNotification
                description={copy.errors.formSummary}
                dismissButton={false}
                heading={copy.errors.formSummaryHeading}
                state="error"
              />
            ) : null}

            <div>
              <div className="font-semibold">{copy.fieldsetContact}</div>
              <div className="mt-static-md grid gap-static-md md:grid-cols-2">
                <div>
                  <div className="mb-static-xxs text-sm">
                    {copy.firstName} *
                  </div>
                  <PInputText
                    hideLabel={true}
                    label=""
                    name="contact-first-name"
                    onChange={(e) => {
                      setForm((s) => ({
                        ...s,
                        firstName: pdsStringValue(e),
                      }));
                      clearError("firstName");
                    }}
                    onInput={(e) => {
                      setForm((s) => ({
                        ...s,
                        firstName: pdsStringValue(e),
                      }));
                      clearError("firstName");
                    }}
                    value={form.firstName}
                  />
                  {errors.firstName ? (
                    <div className="mt-static-xxs text-xs text-red-600">
                      {errors.firstName}
                    </div>
                  ) : null}
                </div>
                <div>
                  <div className="mb-static-xxs text-sm">{copy.lastName} *</div>
                  <PInputText
                    hideLabel={true}
                    label=""
                    name="contact-last-name"
                    onChange={(e) => {
                      setForm((s) => ({
                        ...s,
                        lastName: pdsStringValue(e),
                      }));
                      clearError("lastName");
                    }}
                    onInput={(e) => {
                      setForm((s) => ({
                        ...s,
                        lastName: pdsStringValue(e),
                      }));
                      clearError("lastName");
                    }}
                    value={form.lastName}
                  />
                  {errors.lastName ? (
                    <div className="mt-static-xxs text-xs text-red-600">
                      {errors.lastName}
                    </div>
                  ) : null}
                </div>
                <div className="md:col-span-2">
                  <div className="mb-static-xxs text-sm">{copy.email} *</div>
                  <PInputEmail
                    hideLabel={true}
                    label=""
                    name="contact-email"
                    onChange={(e) => {
                      setForm((s) => ({
                        ...s,
                        email: pdsStringValue(e),
                      }));
                      clearError("email");
                    }}
                    onInput={(e) => {
                      setForm((s) => ({
                        ...s,
                        email: pdsStringValue(e),
                      }));
                      clearError("email");
                    }}
                    value={form.email}
                  />
                  {errors.email ? (
                    <div className="mt-static-xxs text-xs text-red-600">
                      {errors.email}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div>
              <div className="font-semibold">{copy.fieldsetMessage}</div>
              <div className="mt-static-md grid gap-static-md">
                <div>
                  <div className="mb-static-xxs text-sm">{copy.message} *</div>
                  <PTextarea
                    counter
                    hideLabel={true}
                    label=""
                    maxLength={500}
                    name="contact-message"
                    onChange={(e) => {
                      setForm((s) => ({
                        ...s,
                        message: pdsStringValue(e),
                      }));
                      clearError("message");
                    }}
                    onInput={(e) => {
                      setForm((s) => ({
                        ...s,
                        message: pdsStringValue(e),
                      }));
                      clearError("message");
                    }}
                    placeholder={copy.messagePlaceholder}
                    rows={5}
                    value={form.message}
                  />
                  {errors.message ? (
                    <div className="mt-static-xxs text-xs text-red-600">
                      {errors.message}
                    </div>
                  ) : null}
                </div>
                <div>
                  <div className="flex items-center gap-static-xs">
                    <PCheckbox
                      checked={form.privacyAccepted}
                      hideLabel={true}
                      label=""
                      name="contact-privacy"
                      onChange={(e) => {
                        setForm((s) => ({
                          ...s,
                          privacyAccepted: pdsCheckboxChecked(
                            e,
                            s.privacyAccepted,
                          ),
                        }));
                        clearError("privacy");
                      }}
                    >
                      <PPopover slot="label-after">
                        {copy.privacyPopover}
                      </PPopover>
                    </PCheckbox>
                    <span
                      className="cursor-pointer text-sm"
                      onClick={() => {
                        setForm((s) => ({
                          ...s,
                          privacyAccepted: !s.privacyAccepted,
                        }));
                        clearError("privacy");
                      }}
                    >
                      {copy.privacy}
                    </span>
                  </div>
                  {errors.privacy ? (
                    <div className="mt-static-xxs text-xs text-red-600">
                      {errors.privacy}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <PButton type="submit" variant="primary">
              {copy.submit}
            </PButton>
          </form>
        )}
      </div>
    </MainContent>
  );
}
