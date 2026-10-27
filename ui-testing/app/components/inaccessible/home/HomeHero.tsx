"use client";

import { useState } from "react";
import {
  PAiTag,
  PHeading,
  PLink,
  PModal,
  PText,
  PTextList,
  PTextListItem,
} from "@porsche-design-system/components-react/ssr";
import type { Locale } from "@/app/i18n/config";
import type { Dictionary } from "@/app/i18n/get-dictionary";
import { appHref } from "@/app/i18n/href";

type HeroModalCopy = Dictionary["pages"]["home"]["heroModal"];

type Props = {
  alt: string;
  heading: string;
  ctaLabel: string;
  modal: HeroModalCopy;
  productsHref: string;
  locale: Locale;
};

/**
 * Intentional PDS & HTML accessibility defects:
 * - Generic `<div>` instead of `<section aria-labelledby>`
 * - Hero `<img>` omits `alt` attribute (`image-alt` violation)
 * - Hero heading rendered as a styled `<div>` instead of `<h1>` (`page-has-heading-one`)
 * - CTA rendered as a mouse-only `<div onClick>` (no `role="button"`, no `tabIndex`, no keyboard handler — WCAG 2.1.1, 4.1.2)
 * - `PModal` omits `aria={{ "aria-label": ... }}`
 */
export function HomeHero({ ctaLabel, heading, modal, productsHref }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="scheme-dark z-0 rounded-b-4xl h-[clamp(480px,80vh,1000px)] col-full sm:col-wide grid grid-cols-subgrid items-end relative before:absolute before:inset-[0_0_80%_0] before:z-1 before:pointer-events-none before:bg-linear-to-b before:from-canvas before:to-transparent after:absolute after:inset-[50%_0_0_0] after:z-1 after:pointer-events-none after:bg-linear-to-t after:from-canvas after:to-transparent after:rounded-b-4xl">
      {/* Intentional axe `image-alt` violation: <img> without alt */}
      {/* biome-ignore lint/a11y/useAltText: Intentional defect for inaccessible testing variant. */}
      <img
        className="absolute inset-0 h-full w-full object-cover rounded-b-4xl"
        fetchPriority="high"
        src={appHref("/home-teaser.jpg")}
      />
      <div className="z-2 col-extended row-span-full mb-fluid-xl flex flex-col gap-fluid-md items-start">
        {/* Intentional defect: styled <div> instead of <h1> */}
        <div className="prose-heading-xl whitespace-pre-line text-start font-semibold text-primary">
          {heading}
        </div>
        {/* Intentional WCAG 2.1.1 / 4.1.2 defect: mouse-only <div onClick> button */}
        <div
          className="cursor-pointer rounded-sm bg-primary px-static-md py-static-sm font-regular text-canvas select-none"
          data-testid="hero-cta-button"
          onClick={() => setIsModalOpen(true)}
        >
          {ctaLabel}
        </div>
        {/* Intentional PDS Don't: PModal without aria-label */}
        <PModal onDismiss={() => setIsModalOpen(false)} open={isModalOpen}>
          <div className="grid gap-fluid-md">
            <div className="grid gap-static-sm">
              <PText className="inaccessible-low-contrast" size="sm" weight="semibold">
                {modal.eyebrow}
              </PText>
              <PHeading size="2xl" tag="h5">
                {modal.title}
              </PHeading>
              <PText>{modal.intro}</PText>
            </div>
            <PTextList type="numbered">
              {modal.highlights.map((highlight) => (
                <PTextListItem key={highlight}>{highlight}</PTextListItem>
              ))}
            </PTextList>
            <PText className="inaccessible-low-contrast">{modal.outro}</PText>
            <div>
              <PLink href={productsHref} variant="secondary">
                {modal.close}
              </PLink>
            </div>
          </div>
        </PModal>
      </div>
      <PAiTag className="absolute z-3 right-fluid-md bottom-fluid-md" />
    </div>
  );
}
