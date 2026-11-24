"use client";

import { useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Label,
  Radio,
  RadioGroup,
} from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import Button from "../Button";
import type { Locale } from "@/utils/locale";
import { formatPercent, parsePercent } from "@/utils/percent";
import { classes } from "@/utils/react";
import { uiText } from "@/utils/ui-text";

/** The shares offered as they are; any other is the donor's to type. */
export const TIP_PERCENTS = [5, 10, 20];

export interface TipPercentPickerTexts {
  title: string | null;
  other: string | null;
  confirm: string | null;
  cancel: string | null;
  close: string | null;
}

interface TipPercentPickerProps {
  /** The share chosen now, which the picker starts with. */
  percent: number;
  /** The donation the share is of. */
  amount: number;
  onConfirm: (percent: number) => void;
  onClose: () => void;
  money: (amount: number) => string;
  texts: TipPercentPickerTexts;
  locale: Locale;
}

function Option({
  value,
  label,
  extra,
}: {
  value: number | "other";
  label: string;
  extra?: string;
}) {
  return (
    <Radio
      value={value}
      className={({ focus, checked }) =>
        classes(
          checked
            ? "border-primary-600 ring-1 ring-primary-600"
            : "border-slate-300",
          focus ? "bg-primary-50" : "",
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border px-1 py-2.5 text-slate-900 shadow-xs focus:outline-hidden",
        )
      }
    >
      <Label className="cursor-pointer font-semibold">{label}</Label>
      {extra && <span className="text-xs text-slate-500">{extra}</span>}
    </Radio>
  );
}

/**
 * How much to add for the platform: 5%, 10%, 20% or a share of the donor's
 * own. Nothing changes until Confirm. Mounted only while open, so it starts
 * from the share chosen each time.
 */
export default function TipPercentPicker({
  percent,
  amount,
  onConfirm,
  onClose,
  money,
  texts,
  locale,
}: TipPercentPickerProps) {
  const preset = TIP_PERCENTS.includes(percent);
  const [choice, setChoice] = useState<number | "other">(
    preset ? percent : "other",
  );
  const [typed, setTyped] = useState(
    preset ? "" : formatPercent(percent, locale),
  );
  const typedPercent = parsePercent(typed);
  const chosen = choice === "other" ? typedPercent : choice;
  const tipFor = (share: number) => Math.round(share * amount) / 100;

  return (
    <Dialog open={true} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-slate-900/55" />
      <div className="fixed inset-0 flex w-screen items-center justify-center overflow-y-auto p-3 xs:p-4">
        <DialogPanel className="my-auto flex w-full max-w-md flex-col gap-5 rounded-2xl bg-white p-6 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <DialogTitle className="text-xl leading-7 font-bold tracking-tight text-primary-700">
              {texts.title}
            </DialogTitle>
            <button
              type="button"
              onClick={onClose}
              aria-label={texts.close ?? undefined}
              className="-m-2.5 flex-none cursor-pointer rounded-lg p-2.5 text-slate-600 hover:opacity-70"
            >
              <XMarkIcon className="h-6 w-6" aria-hidden={true} />
            </button>
          </div>
          <RadioGroup
            value={choice}
            onChange={setChoice}
            aria-label={texts.title ?? undefined}
            className="grid grid-cols-4 gap-2 xs:gap-3"
          >
            {TIP_PERCENTS.map((share) => (
              <Option
                key={share}
                value={share}
                label={`${formatPercent(share, locale)}%`}
                extra={`+${money(tipFor(share))}`}
              />
            ))}
            <Option value="other" label={texts.other ?? ""} />
          </RadioGroup>
          {choice === "other" && (
            <div className="flex items-center gap-3">
              <div className="relative w-32 rounded-md shadow-xs">
                <input
                  type="text"
                  inputMode="decimal"
                  aria-label={uiText(locale).percentage}
                  value={typed}
                  onChange={(event) => setTyped(event.target.value)}
                  maxLength={6}
                  autoFocus
                  className={classes(
                    typed === "" || typedPercent !== null
                      ? "ring-slate-300 focus:ring-primary-600"
                      : "ring-red-500 focus:ring-red-500",
                    "block w-full rounded-md border-0 py-2.5 pr-8 pl-3 text-slate-900 ring-1 ring-inset focus:ring-2 focus:ring-inset",
                  )}
                />
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">
                  %
                </span>
              </div>
              {typedPercent !== null && (
                <span className="font-semibold text-primary-700">
                  +{money(tipFor(typedPercent))}
                </span>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <Button
              text={texts.cancel}
              type="tertiary"
              size="lg"
              onClick={onClose}
              buttonType="button"
              className="flex-1 basis-28"
            />
            <Button
              text={texts.confirm}
              type="primary"
              size="lg"
              onClick={() => {
                if (chosen !== null) onConfirm(chosen);
              }}
              disabled={chosen === null}
              buttonType="button"
              className="flex-1 basis-40"
            />
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
