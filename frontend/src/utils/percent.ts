import type { Locale } from "./locale";

/** A percent in a site language's style: "7.5" in English, "7,5" in Estonian. */
export function formatPercent(percent: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "en" ? "en-GB" : "et-EE", {
    maximumFractionDigits: 2,
  }).format(percent);
}

/**
 * A typed percent, if it's one: more than 0, at most 100, with up to two
 * decimals after a point or a comma.
 */
export function parsePercent(text: string): number | null {
  const trimmed = text.trim().replace(",", ".");
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(trimmed)) return null;
  const percent = Number(trimmed);
  return percent > 0 && percent <= 100 ? percent : null;
}
