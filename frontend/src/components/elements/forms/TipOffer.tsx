"use client";

import { useState } from "react";
import Markdown from "../Markdown";
import TipPercentPicker from "./TipPercentPicker";
import { formatPercent } from "@/utils/percent";
import type { TipPercentPickerTexts } from "./TipPercentPicker";
import type { Locale } from "@/utils/locale";
import { format } from "@/utils/string";

interface TipOfferProps {
  /** The checkbox's label: "Add <%= percent %>% to support Anneta Targalt". */
  checkboxText: string | null;
  summaryText: string | null;
  /** "I want to support more": choosing a bigger share, once it's ticked. */
  moreText: string | null;
  /** The share, in percent, and what it is of this donation, formatted. */
  percent: number;
  amountText: string;
  addTip: boolean;
  setAddTip: (addTip: boolean) => void;
  setPercent: (percent: number) => void;
  /** The donation the share is of, and how amounts are shown, for the picker. */
  donationAmount: number;
  money: (amount: number) => string;
  pickerTexts: TipPercentPickerTexts;
  locale: Locale;
}

/**
 * The support for the platform, offered as a box to tick and a line on why:
 * 5% unless the donor, having ticked it, chooses more.
 */
export default function TipOffer({
  checkboxText,
  summaryText,
  moreText,
  percent,
  amountText,
  addTip,
  setAddTip,
  setPercent,
  donationAmount,
  money,
  pickerTexts,
  locale,
}: TipOfferProps) {
  const [picking, setPicking] = useState(false);

  return (
    <div className="flex flex-col gap-1.5 rounded-lg bg-primary-50 p-4">
      <label className="flex cursor-pointer items-start gap-2.5 text-sm font-semibold text-slate-900">
        <input
          type="checkbox"
          name="tip"
          checked={addTip}
          onChange={(event) => setAddTip(event.target.checked)}
          className="mt-0.5 h-4 w-4 flex-none cursor-pointer rounded-sm border-slate-300 text-primary-600 checked:border-transparent focus:ring-primary-600"
        />
        {/* Markdown, as the checkbox labels are elsewhere: editors bold it. */}
        <Markdown className="prose prose-sm flex-1 prose-primary [&_p]:my-0">
          {format(checkboxText ?? "", {
            percent: formatPercent(percent, locale),
          })}
        </Markdown>
        <span className="whitespace-nowrap text-primary-700">
          +{amountText}
        </span>
      </label>
      {summaryText && (
        <p className="ml-6.5 text-sm text-slate-600">{summaryText}</p>
      )}
      {addTip && moreText && (
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="-mb-1 ml-6.5 cursor-pointer self-start py-1.5 text-sm font-semibold text-primary-700 underline hover:opacity-70"
        >
          {moreText}
        </button>
      )}
      {picking && (
        <TipPercentPicker
          percent={percent}
          amount={donationAmount}
          onConfirm={(chosen) => {
            setPercent(chosen);
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
          money={money}
          texts={pickerTexts}
          locale={locale}
        />
      )}
    </div>
  );
}
