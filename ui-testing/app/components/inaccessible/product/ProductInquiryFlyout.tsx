"use client";

import {
  type CSSProperties,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  PButton,
  PCheckbox,
  PFlyout,
  PHeading,
  PInlineNotification,
  PInputDate,
  PInputEmail,
  PInputMonth,
  PInputPassword,
  PInputTel,
  PInputText,
  PInputTime,
  PInputWeek,
  PMultiSelect,
  PMultiSelectOption,
  POptgroup,
  PPinCode,
  PPopover,
  PRadioGroup,
  PRadioGroupOption,
  PSegmentedControl,
  PSegmentedControlItem,
  PSelect,
  PSelectOption,
  PSpinner,
  PStepperHorizontal,
  PStepperHorizontalItem,
  PSwitch,
  PText,
  PTextarea,
  type StepperHorizontalUpdateEventDetail,
} from "@porsche-design-system/components-react/ssr";
import type { ProductInquiryCopy } from "@/app/components/accessible/product/ProductInquiryFlyout";
import {
  createInitialInquiryFormState,
  createInquirySteps,
  getActiveInquiryStepIndex,
  getInquiryStepIndexForField,
  hasInquiryValidationErrors,
  INQUIRY_ERROR_FIELD_ORDER,
  INQUIRY_STEP_FIELDS,
  INQUIRY_STEP_IDS,
  type InquiryFieldErrorKey,
  type InquiryFieldErrors,
  type InquiryStepConfig,
  pdsCheckboxChecked,
  pdsStringArrayValue,
  pdsStringValue,
  pdsSwitchChecked,
  setActiveInquiryStepIndex,
  validateInquiryForm,
  validateInquiryStep,
} from "@/app/lib/product-inquiry";

type Props = {
  copy: ProductInquiryCopy;
  productName: string;
  productImageSrc: string;
  productImageAlt: string;
};

const FLYOUT_STYLE = {
  "--p-flyout-width": "min(100vw, 760px)",
} as CSSProperties;

type CountryLabelKey = keyof Pick<
  ProductInquiryCopy,
  | "countryUs"
  | "countryCa"
  | "countryMx"
  | "countryBr"
  | "countryDe"
  | "countryAt"
  | "countryCh"
  | "countryFr"
  | "countryGb"
  | "countryIt"
  | "countryEs"
  | "countryNl"
  | "countryBe"
  | "countryPl"
  | "countrySe"
  | "countryNo"
  | "countryDk"
  | "countryFi"
  | "countryIe"
  | "countryPt"
  | "countryCz"
  | "countryHu"
  | "countryRo"
  | "countryJp"
  | "countryCn"
  | "countryIn"
  | "countrySg"
  | "countryKr"
  | "countryAu"
  | "countryAe"
  | "countryZa"
>;

type CountryGroupKey = keyof Pick<
  ProductInquiryCopy,
  | "countryGroupAmericas"
  | "countryGroupEurope"
  | "countryGroupAsiaPacific"
  | "countryGroupMiddleEastAfrica"
>;

const COUNTRY_GROUPS: {
  groupKey: CountryGroupKey;
  options: { value: string; labelKey: CountryLabelKey }[];
}[] = [
  {
    groupKey: "countryGroupAmericas",
    options: [
      { value: "us", labelKey: "countryUs" },
      { value: "ca", labelKey: "countryCa" },
      { value: "mx", labelKey: "countryMx" },
      { value: "br", labelKey: "countryBr" },
    ],
  },
  {
    groupKey: "countryGroupEurope",
    options: [
      { value: "de", labelKey: "countryDe" },
      { value: "at", labelKey: "countryAt" },
      { value: "ch", labelKey: "countryCh" },
      { value: "fr", labelKey: "countryFr" },
      { value: "gb", labelKey: "countryGb" },
      { value: "it", labelKey: "countryIt" },
      { value: "es", labelKey: "countryEs" },
      { value: "nl", labelKey: "countryNl" },
      { value: "be", labelKey: "countryBe" },
      { value: "pl", labelKey: "countryPl" },
      { value: "se", labelKey: "countrySe" },
      { value: "no", labelKey: "countryNo" },
      { value: "dk", labelKey: "countryDk" },
      { value: "fi", labelKey: "countryFi" },
      { value: "ie", labelKey: "countryIe" },
      { value: "pt", labelKey: "countryPt" },
      { value: "cz", labelKey: "countryCz" },
      { value: "hu", labelKey: "countryHu" },
      { value: "ro", labelKey: "countryRo" },
    ],
  },
  {
    groupKey: "countryGroupAsiaPacific",
    options: [
      { value: "jp", labelKey: "countryJp" },
      { value: "cn", labelKey: "countryCn" },
      { value: "in", labelKey: "countryIn" },
      { value: "sg", labelKey: "countrySg" },
      { value: "kr", labelKey: "countryKr" },
      { value: "au", labelKey: "countryAu" },
    ],
  },
  {
    groupKey: "countryGroupMiddleEastAfrica",
    options: [
      { value: "ae", labelKey: "countryAe" },
      { value: "za", labelKey: "countryZa" },
    ],
  },
];

type PostSubmitPhase = "idle" | "pending" | "done";

/**
 * Intentional PDS & WCAG defects:
 * - `PFlyout` omits `aria={{ "aria-label": ... }}`
 * - Header `<img>` omits `alt` attribute (`image-alt`)
 * - All PDS form controls (`PRadioGroup`, `PSegmentedControl`, `PInput*`, `PSelect`, `PMultiSelect`, `PTextarea`, `PCheckbox`, `PPinCode`)
 *   use `hideLabel={true}` and `label=""` with unlinked visual `<div>` labels above them
 * - Validation errors are rendered as unassociated red `<div>` text (omitting `state="error"` and `message` prop)
 * - No focus management when navigating steps or triggering validation errors
 * - omits `<PFieldset>` grouping
 * - Close icon button in footer uses `hideLabel={true}` with empty children and no `aria-label`
 * - Submit spinner and success notification omit `role="status"` and `aria-live`
 */
export function ProductInquiryFlyout({
  copy,
  productName,
  productImageSrc,
}: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(createInitialInquiryFormState);
  const [errors, setErrors] = useState<InquiryFieldErrors>({});
  const [steps, setSteps] = useState<InquiryStepConfig[]>(() =>
    createInquirySteps(copy),
  );
  const [postSubmitPhase, setPostSubmitPhase] =
    useState<PostSubmitPhase>("idle");
  const activeStepIndex = getActiveInquiryStepIndex(steps);

  const navigateToStep = useCallback((targetIndex: number) => {
    setSteps((prev) => setActiveInquiryStepIndex([...prev], targetIndex));
  }, []);

  const clearError = useCallback((key: InquiryFieldErrorKey) => {
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const resetAndClose = useCallback(() => {
    setForm(createInitialInquiryFormState());
    setErrors({});
    setSteps(createInquirySteps(copy));
    setPostSubmitPhase("idle");
    setOpen(false);
  }, [copy]);

  useEffect(() => {
    if (postSubmitPhase !== "pending") return;
    const id = window.setTimeout(() => {
      setPostSubmitPhase("done");
    }, 5000);
    return () => window.clearTimeout(id);
  }, [postSubmitPhase]);

  const handleSubmit = useCallback(() => {
    const next = validateInquiryForm(form, copy.errors);
    setErrors(next);
    if (hasInquiryValidationErrors(next)) {
      const firstKey = INQUIRY_ERROR_FIELD_ORDER.find(
        (key) => next[key] != null && next[key] !== "",
      );
      const stepIndex = firstKey ? getInquiryStepIndexForField(firstKey) : 0;
      navigateToStep(stepIndex);
      return;
    }
    setErrors({});
    setPostSubmitPhase("pending");
  }, [form, copy.errors, navigateToStep]);

  const handlePrevStep = useCallback(() => {
    if (activeStepIndex === 0) return;
    navigateToStep(activeStepIndex - 1);
  }, [activeStepIndex, navigateToStep]);

  const handleNextStep = useCallback(() => {
    const stepErrors = validateInquiryStep(form, copy.errors, activeStepIndex);
    if (hasInquiryValidationErrors(stepErrors)) {
      setErrors((prev) => ({ ...prev, ...stepErrors }));
      return;
    }
    setErrors((prev) => {
      const next = { ...prev };
      for (const key of INQUIRY_STEP_FIELDS[INQUIRY_STEP_IDS[activeStepIndex]]) {
        delete next[key];
      }
      return next;
    });
    if (activeStepIndex < steps.length - 1) {
      navigateToStep(activeStepIndex + 1);
    }
  }, [activeStepIndex, copy.errors, form, navigateToStep, steps.length]);

  const handleStepperUpdate = useCallback(
    (event: CustomEvent<StepperHorizontalUpdateEventDetail>) => {
      const { activeStepIndex: targetIndex } = event.detail;
      navigateToStep(targetIndex);
    },
    [navigateToStep],
  );

  return (
    <>
      <PButton
        data-testid="inquiry-flyout-trigger"
        icon="shopping-cart"
        onClick={() => {
          setForm(createInitialInquiryFormState());
          setErrors({});
          setSteps(createInquirySteps(copy));
          setPostSubmitPhase("idle");
          setOpen(true);
        }}
        type="button"
      >
        {copy.triggerLabel}
      </PButton>

      <PFlyout
        footerBehavior="fixed"
        onDismiss={resetAndClose}
        open={open}
        style={FLYOUT_STYLE}
      >
        <div className="grid gap-fluid-md">
          <div className="flex items-start gap-static-md" slot="header">
            <div className="relative h-[100px] w-[104px] shrink-0 overflow-hidden rounded-md bg-contrast-low">
              {/* Intentional axe `image-alt` violation: <img> without alt */}
              {/* biome-ignore lint/a11y/useAltText: Intentional defect for inaccessible testing variant. */}
              <img
                className="h-full w-full object-cover"
                src={productImageSrc}
              />
            </div>
            <div className="grid min-w-0 gap-static-xs">
              <PHeading size="sm" tag="h5">
                {productName}
              </PHeading>
              <PText
                className="inaccessible-low-contrast"
                color="inherit"
                size="sm"
              >
                {copy.subtitle}
              </PText>
            </div>
          </div>

          <div className="grid gap-fluid-md">
            {postSubmitPhase === "done" ? (
              <div className="grid gap-fluid-md">
                <PInlineNotification
                  description={copy.successDescription}
                  dismissButton={false}
                  heading={copy.successHeading}
                  state="success"
                />
              </div>
            ) : postSubmitPhase === "pending" ? (
              <div className="flex min-h-[200px] flex-col items-center justify-center gap-static-md py-fluid-lg">
                {/* Intentional PDS Don't: PSpinner without aria-label */}
                <PSpinner size="lg" />
                <PText
                  className="inaccessible-low-contrast"
                  color="inherit"
                  size="sm"
                >
                  {copy.submittingHint}
                </PText>
              </div>
            ) : (
              <>
                {hasInquiryValidationErrors(errors) ? (
                  <PInlineNotification
                    description={copy.errors.formSummary}
                    dismissButton={false}
                    heading={copy.errors.formSummaryHeading}
                    state="error"
                  />
                ) : null}

                <PStepperHorizontal onUpdate={handleStepperUpdate}>
                  {steps.map(({ state, name }) => (
                    <PStepperHorizontalItem key={name} state={state}>
                      {name}
                    </PStepperHorizontalItem>
                  ))}
                </PStepperHorizontal>

                {activeStepIndex === 0 ? (
                  <div>
                    <div className="font-semibold">{copy.fieldsetRequestType}</div>
                    <div className="mt-static-md grid gap-static-md">
                      <div>
                        <div className="mb-static-xxs text-sm">
                          {copy.inquiryTypeLabel} *
                        </div>
                        <PRadioGroup
                          hideLabel={true}
                          label=""
                          name="inquiry-type"
                          onChange={(e) => {
                            setForm((s) => ({
                              ...s,
                              inquiryType: pdsStringValue(e),
                            }));
                            clearError("inquiryType");
                          }}
                          value={form.inquiryType}
                        >
                          <PRadioGroupOption
                            label={copy.inquiryTypeQuote}
                            value="quote"
                          />
                          <PRadioGroupOption
                            label={copy.inquiryTypeAvailability}
                            value="availability"
                          />
                          <PRadioGroupOption
                            label={copy.inquiryTypeSupport}
                            value="support"
                          />
                        </PRadioGroup>
                        {errors.inquiryType ? (
                          <div className="mt-static-xxs text-xs text-red-600">
                            {errors.inquiryType}
                          </div>
                        ) : null}
                      </div>

                      <div>
                        <div className="mb-static-xxs text-sm">
                          {copy.priorityLabel}
                        </div>
                        <PSegmentedControl
                          columns={{ base: 1, s: 3 }}
                          hideLabel={true}
                          label=""
                          name="inquiry-priority"
                          onChange={(e) =>
                            setForm((s) => ({
                              ...s,
                              priority: pdsStringValue(e),
                            }))
                          }
                          value={form.priority}
                        >
                          <PSegmentedControlItem value="normal">
                            {copy.priorityNormal}
                          </PSegmentedControlItem>
                          <PSegmentedControlItem value="high">
                            {copy.priorityHigh}
                          </PSegmentedControlItem>
                          <PSegmentedControlItem value="urgent">
                            {copy.priorityUrgent}
                          </PSegmentedControlItem>
                        </PSegmentedControl>
                      </div>
                    </div>
                  </div>
                ) : null}

                {activeStepIndex === 1 ? (
                  <div>
                    <div className="font-semibold">{copy.fieldsetContact}</div>
                    <div className="mt-static-md grid gap-static-md md:grid-cols-2">
                      <div>
                        <div className="mb-static-xxs text-sm">
                          {copy.firstName} *
                        </div>
                        <PInputText
                          hideLabel={true}
                          id="duplicate-inquiry-input"
                          label=""
                          name="inquiry-first-name"
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
                        <div className="mb-static-xxs text-sm">
                          {copy.lastName} *
                        </div>
                        <PInputText
                          hideLabel={true}
                          id="duplicate-inquiry-input"
                          label=""
                          name="inquiry-last-name"
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
                      <div>
                        <div className="mb-static-xxs text-sm">
                          {copy.email} *
                        </div>
                        <PInputEmail
                          hideLabel={true}
                          label=""
                          name="inquiry-email"
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
                      <div>
                        <div className="mb-static-xxs text-sm">{copy.phone}</div>
                        <PInputTel
                          hideLabel={true}
                          label=""
                          name="inquiry-phone"
                          onChange={(e) =>
                            setForm((s) => ({
                              ...s,
                              phone: pdsStringValue(e),
                            }))
                          }
                          onInput={(e) =>
                            setForm((s) => ({
                              ...s,
                              phone: pdsStringValue(e),
                            }))
                          }
                          value={form.phone}
                        />
                      </div>
                    </div>
                  </div>
                ) : null}

                {activeStepIndex === 2 ? (
                  <div>
                    <div className="font-semibold">{copy.fieldsetLocation}</div>
                    <div className="mt-static-md grid gap-static-md">
                      <div>
                        <div className="mb-static-xxs text-sm">
                          {copy.country}
                        </div>
                        <PMultiSelect
                          hideLabel={true}
                          label=""
                          name="inquiry-country"
                          onChange={(e) =>
                            setForm((s) => ({
                              ...s,
                              country: pdsStringArrayValue(e),
                            }))
                          }
                          value={form.country}
                        >
                          {COUNTRY_GROUPS.map(({ groupKey, options }) => (
                            <POptgroup key={groupKey} label={copy[groupKey]}>
                              {options.map(({ value, labelKey }) => (
                                <PMultiSelectOption key={value} value={value}>
                                  {copy[labelKey]}
                                </PMultiSelectOption>
                              ))}
                            </POptgroup>
                          ))}
                        </PMultiSelect>
                      </div>
                      <div>
                        <div className="mb-static-xxs text-sm">
                          {copy.contactChannels}
                        </div>
                        <PSelect
                          hideLabel={true}
                          label=""
                          name="inquiry-channels"
                          onChange={(e) =>
                            setForm((s) => ({
                              ...s,
                              channels: pdsStringValue(e),
                            }))
                          }
                          value={form.channels}
                        >
                          <PSelectOption value="email">
                            {copy.channelEmail}
                          </PSelectOption>
                          <PSelectOption value="phone">
                            {copy.channelPhone}
                          </PSelectOption>
                          <PSelectOption value="sms">
                            {copy.channelSms}
                          </PSelectOption>
                        </PSelect>
                      </div>
                      <div>
                        <div className="mb-static-xxs text-sm">
                          {copy.message} *
                        </div>
                        <PTextarea
                          counter
                          hideLabel={true}
                          label=""
                          maxLength={50}
                          name="inquiry-message"
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
                      <PSwitch
                        checked={form.newsletter}
                        hideLabel={true}
                        onUpdate={(e) =>
                          setForm((s) => ({
                            ...s,
                            newsletter: pdsSwitchChecked(e),
                          }))
                        }
                      >
                        {copy.newsletter}
                      </PSwitch>
                      <div>
                        <PCheckbox
                          checked={form.privacyAccepted}
                          hideLabel={true}
                          label={copy.privacy}
                          name="inquiry-privacy"
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
                        {errors.privacy ? (
                          <div className="mt-static-xxs text-xs text-red-600">
                            {errors.privacy}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}

                {activeScolor="inherit"
                        tepIndex === 3 ? (
                  <div className="grid gap-static-md">
                    <div>
                      <div className="font-semibold">
                        {copy.fieldsetScheduling}
                      </div>
                      <PText
                        className="mt-static-sm inaccessible-low-contrast"
                        size="sm"
                      >
                        {copy.schedulingHint}
                      </PText>
                      <div className="mt-static-md grid gap-static-md md:grid-cols-2">
                        <div>
                          <div className="mb-static-xxs text-sm">
                            {copy.preferredDate}
                          </div>
                          <PInputDate
                            hideLabel={true}
                            label=""
                            name="inquiry-date"
                            onChange={(e) =>
                              setForm((s) => ({
                                ...s,
                                preferredDate: pdsStringValue(e),
                              }))
                            }
                            onInput={(e) =>
                              setForm((s) => ({
                                ...s,
                                preferredDate: pdsStringValue(e),
                              }))
                            }
                            value={form.preferredDate}
                          />
                        </div>
                        <div>
                          <div className="mb-static-xxs text-sm">
                            {copy.preferredTime}
                          </div>
                          <PInputTime
                            hideLabel={true}
                            label=""
                            name="inquiry-time"
                            onChange={(e) =>
                              setForm((s) => ({
                                ...s,
                                preferredTime: pdsStringValue(e),
                              }))
                            }
                            onInput={(e) =>
                              setForm((s) => ({
                                ...s,
                                preferredTime: pdsStringValue(e),
                              }))
                            }
                            value={form.preferredTime}
                          />
                        </div>
                        <div>
                          <div className="mb-static-xxs text-sm">
                            {copy.preferredMonth}
                          </div>
                          <PInputMonth
                            hideLabel={true}
                            label=""
                            name="inquiry-month"
                            onChange={(e) =>
                              setForm((s) => ({
                                ...s,
                                preferredMonth: pdsStringValue(e),
                              }))
                            }
                            onInput={(e) =>
                              setForm((s) => ({
                                ...s,
                                preferredMonth: pdsStringValue(e),
                              }))
                            }
                            value={form.preferredMonth}
                          />
                        </div>
                        <div>
                          <div className="mb-static-xxs text-sm">
                            {copy.preferredWeek}
                          </div>
                          <PInputWeek
                            hideLabel={true}
                            label=""
                            name="inquiry-week"
                            onChange={(e) =>
                              setForm((s) => ({
                                ...s,
                                preferredWeek: pdsStringValue(e),
                              }))
                            }
                            onInput={(e) =>
                              setForm((s) => ({
                                ...s,
                                preferredWeek: pdsStringValue(e),
                              }))
                            }
                            value={form.preferredWeek}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="mb-static-xxs text-sm">{copy.pinLabel}</div>
                      <PPinCode
                        hideLabel={true}
                        label=""
                        length={4}
                        name="inquiry-pin"
                        onChange={(e) =>
                          setForm((s) => ({
                            ...s,
                            pin: pdsStringValue(e),
                          }))
                        }
                        value={form.pin}
                      />
                    </div>

                    <div>
                      <div className="mb-static-xxs text-sm">
                        {copy.passwordDemoLabel}
                      </div>
                      <PInputPassword
                        hideLabel={true}
                        label=""
                        name="inquiry-password-demo"
                        onChange={(e) =>
                          setForm((s) => ({
                            ...s,
                            passwordDemo: pdsStringValue(e),
                          }))
                        }
                        onInput={(e) =>
                          setForm((s) => ({
                            ...s,
                            passwordDemo: pdsStringValue(e),
                          }))
                        }
                        toggle={true}
                        value={form.passwordDemo}
                      />
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-static-sm" slot="footer">
          {postSubmitPhase === "done" ? (
            <PButton onClick={resetAndClose} type="button" variant="primary">
              {copy.successClose}
            </PButton>
          ) : postSubmitPhase === "pending" ? (
            <PButton onClick={resetAndClose} type="button" variant="secondary">
              {copy.close}
            </PButton>
          ) : (
            <>
              <PButton
                disabled={activeStepIndex === 0}
                icon="arrow-head-left"
                onClick={handlePrevStep}
                type="button"
                variant="secondary"
              >
                {copy.stepPrevious}
              </PButton>
              {activeStepIndex < steps.length - 1 ? (
                <PButton
                  onClick={handleNextStep}
                  type="button"
                  variant="primary"
                >
                  {copy.stepNext}
                </PButton>
              ) : (
                <PButton onClick={handleSubmit} type="button" variant="primary">
                  {copy.submit}
                </PButton>
              )}
              {/* Intentional PDS Don't: icon-only button with hideLabel=true and empty children */}
              <PButton
                hideLabel={true}
                icon="close"
                onClick={resetAndClose}
                type="button"
                variant="secondary"
              />
            </>
          )}
        </div>
      </PFlyout>
    </>
  );
}
