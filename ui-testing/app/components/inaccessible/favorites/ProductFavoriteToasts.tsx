"use client";

import { useEffect, useRef, useState } from "react";
import { useProductFavorites } from "@/app/components/favorites/ProductFavoritesProvider";
import type { FavoriteToastCopy } from "@/app/components/favorites/ProductFavoriteToasts";

type Props = {
  copy: FavoriteToastCopy;
};

/**
 * Intentional WCAG 4.1.3 (Status Messages) defect:
 * Renders a visual toast banner in a plain `<div>` without `role="status"` or `aria-live="polite"`.
 */
export function ProductFavoriteToasts({ copy }: Props) {
  const { favoriteSlugs, isHydrated } = useProductFavorites();
  const previousSlugsRef = useRef<readonly string[] | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isHydrated) return;

    if (previousSlugsRef.current === null) {
      previousSlugsRef.current = favoriteSlugs;
      return;
    }

    const previous = new Set(previousSlugsRef.current);
    const current = new Set(favoriteSlugs);
    const added = favoriteSlugs.filter((slug) => !previous.has(slug));
    const removed = previousSlugsRef.current.filter(
      (slug) => !current.has(slug),
    );

    previousSlugsRef.current = favoriteSlugs;

    if (added.length === 1 && removed.length === 0) {
      setToastMessage(copy.added);
      const timer = window.setTimeout(() => setToastMessage(null), 3500);
      return () => window.clearTimeout(timer);
    }

    if (removed.length === 1 && added.length === 0) {
      setToastMessage(copy.removed);
      const timer = window.setTimeout(() => setToastMessage(null), 3500);
      return () => window.clearTimeout(timer);
    }
  }, [copy.added, copy.removed, favoriteSlugs, isHydrated]);

  if (!toastMessage) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 rounded-md bg-contrast-high px-static-md py-static-sm text-sm text-canvas shadow-lg"
      data-testid="inaccessible-favorite-toast"
    >
      {toastMessage}
    </div>
  );
}
