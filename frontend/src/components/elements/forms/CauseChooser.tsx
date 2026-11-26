"use client";

import { useId, useState } from "react";
import Markdown from "../Markdown";
import CharityPicker from "./CharityPicker";
import type { CharityPickerTexts } from "./CharityPicker";
import SplitBar from "./SplitBar";
import type Proportions from "@/utils/proportions";
import type { ProportionKey } from "@/utils/proportions";
import type { StrapiCause } from "@/types/generated/strapi";
import type { Locale } from "@/utils/locale";
import {
  SUPPORT_KEY,
  amountsByCause,
  causeName,
  fundOf,
  isFundOnly,
  supportShare,
} from "@/utils/donation-amounts";
import { track } from "@/utils/analytics";
import { classes } from "@/utils/react";
import { isStartingSplit, startingSplit, toggledShares } from "@/utils/split";

export interface CauseChooserTexts extends CharityPickerTexts {
  legend: string | null;
  hint: string | null;
  notChosen: string | null;
  /** "I want to specify": choosing charities, while it's the fund alone. */
  specifyCharities: string | null;
  /** "Edit": changing the charities chosen. */
  editCharities: string | null;
  /** "Support Anneta Targalt": the platform, a choice beside the causes. */
  support: string | null;
  /** Under it: why, in Markdown, with a link to more. */
  supportDescription: string | null;
  /** "Reset split": back to 5% for support, as "Split evenly" is without it. */
  resetSplit: string | null;
  splitHint: string | null;
}

interface CauseChooserProps {
  causes: { data: StrapiCause[] };
  /** The platform's organization, which support goes to; none, no support. */
  supportOrganization: string | null;
  proportions: Proportions;
  setProportions: (proportions: Proportions) => void;
  amount: number;
  money: (amount: number) => string;
  texts: CauseChooserTexts;
  locale: Locale;
}

const hasInternalId = <T extends { internalId: string | null }>(
  organization: T,
): organization is T & { internalId: string } =>
  organization.internalId !== null;

interface ChoiceCardProps {
  inputId: string;
  on: boolean;
  onToggle: () => void;
  title: string | null;
  /** Under the title: what the choice is, or the way to its charities. */
  below?: React.ReactNode;
  /** The id of what describes it, for the checkbox. */
  describedBy?: string;
  share: number;
  /** Under the share: its amount or "Not chosen"; none, when listed below. */
  amountText: string | null;
  /** Under it all: where it goes, each with its amount. */
  children?: React.ReactNode;
}

/**
 * One of the choices: a cause, or support for the platform.
 */
function ChoiceCard({
  inputId,
  on,
  onToggle,
  title,
  below,
  describedBy,
  share,
  amountText,
  children,
}: ChoiceCardProps) {
  return (
    <div
      className={classes(
        on
          ? "bg-primary-50 ring-2 ring-primary-600"
          : "bg-white ring-1 ring-slate-400",
        "relative rounded-xl ring-inset",
      )}
    >
      <div
        className={classes(
          children ? "pb-1.5" : "",
          "flex items-start gap-3 p-3.5 xs:px-4",
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col items-start">
          {/* Stretched over the whole card, so all of it ticks the box,
              but for the box itself and the card's links and buttons, which
              sit above. */}
          <label className="flex cursor-pointer items-start gap-3 self-stretch after:absolute after:inset-0 after:rounded-xl">
            <input
              id={inputId}
              type="checkbox"
              checked={on}
              onChange={onToggle}
              aria-describedby={describedBy}
              className="relative z-10 mt-0.5 h-5 w-5 flex-none cursor-pointer rounded-sm border-slate-400 text-primary-600 checked:border-transparent focus:ring-primary-600"
            />
            <span className="min-w-0 flex-1 text-base leading-6 font-semibold text-slate-900">
              {title}
            </span>
          </label>
          {below}
        </div>
        {/* The checkbox's too, its share and amount part of its name. */}
        <label
          htmlFor={inputId}
          className="flex-none cursor-pointer self-center text-right whitespace-nowrap"
        >
          <span
            className={classes(
              on ? "text-primary-700" : "text-slate-500",
              "block text-lg leading-6 font-bold",
            )}
          >
            {share}%
          </span>
          {amountText !== null && (
            <span className="block text-[13px] leading-[18px] text-slate-500">
              {amountText}
            </span>
          )}
        </label>
      </div>
      {children}
    </div>
  );
}

/**
 * Where the donation goes: the causes to tick, and support for the platform
 * beside them, split evenly between the ticked causes (5% to support) and
 * adjustable with a split bar; and each ticked cause's organizations, its
 * fund unless the donor picks others.
 */
export default function CauseChooser({
  causes,
  supportOrganization,
  proportions,
  setProportions,
  amount,
  money,
  texts,
  locale,
}: CauseChooserProps) {
  const [pickerCause, setPickerCause] = useState<number | null>(null);
  const idPrefix = useId();
  const chosen = proportions.chosenKeys();
  const amounts = amountsByCause(
    proportions,
    amount,
    causes,
    supportOrganization,
  );

  // Every choice in the split bar's order: the causes, then support.
  const choices = [
    ...causes.data.map((cause) => ({
      key: cause.id,
      label: cause.title ?? "",
    })),
    ...(supportOrganization
      ? [
          {
            key: SUPPORT_KEY,
            label: texts.support ?? "",
          },
        ]
      : []),
  ];
  const chosenChoices = choices.filter(({ key }) => chosen.includes(key));
  const supportOn = chosen.includes(SUPPORT_KEY);

  // Every choice's share, in the bar's order, and support's place in it.
  const keys = choices.map(({ key }) => key);
  const shares = keys.map((key) => proportions.getProportion(key));
  const supportIndex = keys.indexOf(SUPPORT_KEY);
  // Ticking or unticking keeps a split the donor adjusted, in proportion:
  // only Reset split (or Split evenly) starts it over. See toggledShares.
  // `name` is what analytics calls it.
  const toggle = (key: ProportionKey, name: string) => {
    track("cause:toggled", { cause: name, chosen: !chosen.includes(key) });
    setProportions(
      proportions.withShares(
        keys,
        toggledShares(shares, keys.indexOf(key), supportIndex),
      ),
    );
  };
  const startOver = () =>
    proportions.withShares(
      keys,
      startingSplit(
        shares.map((share) => share > 0),
        supportIndex,
      ),
    );
  const atStart = isStartingSplit(shares, supportIndex);

  // Just the cause's fund, as it starts.
  const fundOnly = (cause: StrapiCause) =>
    isFundOnly(cause, proportions.get(cause.id).proportions);

  const picked = causes.data.find((cause) => cause.id === pickerCause);
  const pickedProportions = picked && proportions.get(picked.id).proportions;
  const supportInputId = `${idPrefix}-support`;
  const supportDescriptionId = `${idPrefix}-support-description`;

  return (
    <fieldset className="mt-2 flex flex-col gap-3">
      <legend className="mb-1 text-xl leading-6 font-semibold tracking-tight text-primary-700">
        {texts.legend}
      </legend>
      {texts.hint && (
        // Markdown, for a link to more about the causes.
        <Markdown
          className="prose prose-sm mb-3 max-w-none text-slate-500 prose-primary [&_p]:my-0"
          newTabs="all"
        >
          {texts.hint}
        </Markdown>
      )}
      {amounts.causes.map(({ cause, organizations }) => {
        const on = chosen.includes(cause.id);
        const descriptionId = `${idPrefix}-cause-${cause.id}-description`;
        const pickerButton = (text: string | null, className: string) => (
          <button
            type="button"
            onClick={() => {
              track("charity-picker:opened", { cause: causeName(cause) });
              setPickerCause(cause.id);
            }}
            aria-label={`${text ?? ""}: ${cause.title ?? ""}`}
            className={classes(
              "relative cursor-pointer py-2.5 text-[13px] leading-[18px] font-semibold text-primary-700 underline hover:opacity-70",
              className,
            )}
          >
            {text}
          </button>
        );
        return (
          <ChoiceCard
            key={cause.id}
            inputId={`${idPrefix}-cause-${cause.id}`}
            on={on}
            onToggle={() => toggle(cause.id, causeName(cause))}
            title={cause.title}
            // The cause's short description while unticked; once ticked,
            // where it goes instead, listed below.
            below={
              !on &&
              cause.shortDescription && (
                <p
                  id={descriptionId}
                  className="mt-0.5 ml-8 text-[13px] leading-[18px] text-slate-500"
                >
                  {cause.shortDescription}
                </p>
              )
            }
            describedBy={
              !on && cause.shortDescription ? descriptionId : undefined
            }
            share={proportions.getProportion(cause.id)}
            // Once ticked, the amounts are listed with where they go.
            amountText={on ? null : texts.notChosen}
          >
            {/* Where it goes: the cause's fund, as it starts, or the
                charities the donor picked, each with its amount. */}
            {on && (
              <div className="flex flex-col gap-1 pr-3.5 pb-2.5 pl-[46px] xs:pr-4 xs:pl-12">
                <ul className="flex flex-col gap-1 text-[13px] leading-[18px]">
                  {organizations.map(({ organization, amount: part }) => (
                    <li
                      key={organization.internalId}
                      className="flex justify-between gap-3"
                    >
                      <span className="min-w-0 font-medium text-slate-900">
                        {organization.title}
                        {/* As in the window with the charities. */}
                        {organization.internalId === fundOf(cause) &&
                          texts.recommended && (
                            <span className="font-normal opacity-50">
                              {` (${texts.recommended})`}
                            </span>
                          )}
                      </span>
                      <span className="flex-none font-semibold whitespace-nowrap text-slate-700">
                        {money(part)}
                      </span>
                    </li>
                  ))}
                </ul>
                {pickerButton(
                  fundOnly(cause)
                    ? texts.specifyCharities
                    : texts.editCharities,
                  "-mt-1 -mb-2 self-start",
                )}
              </div>
            )}
          </ChoiceCard>
        );
      })}
      {supportOrganization && (
        <ChoiceCard
          inputId={supportInputId}
          on={supportOn}
          onToggle={() => toggle(SUPPORT_KEY, SUPPORT_KEY)}
          title={texts.support}
          below={
            texts.supportDescription && (
              <div id={supportDescriptionId} className="mt-0.5 ml-8">
                {/* Markdown, for the link to more about the platform. */}
                <Markdown
                  className="prose prose-sm max-w-none text-[13px] leading-[18px] text-slate-500 prose-primary [&_a]:relative [&_p]:my-0"
                  newTabs="all"
                >
                  {texts.supportDescription}
                </Markdown>
              </div>
            )
          }
          describedBy={
            texts.supportDescription ? supportDescriptionId : undefined
          }
          share={supportShare(proportions)}
          amountText={supportOn ? money(amounts.support) : texts.notChosen}
        />
      )}
      {chosenChoices.length > 1 && (
        <div className="mt-2 flex flex-col gap-1">
          <div className="flex min-h-8 items-center justify-between gap-3">
            <span className="text-sm font-semibold text-slate-700">
              {texts.adjustSplit}
            </span>
            {!atStart && (
              <button
                type="button"
                onClick={() => {
                  track("donation-split:changed", { how: "reset" });
                  setProportions(startOver());
                }}
                className="cursor-pointer py-1.5 text-sm font-semibold text-primary-700 underline hover:opacity-70"
              >
                {supportOn ? texts.resetSplit : texts.splitEvenly}
              </button>
            )}
          </div>
          <SplitBar
            parts={chosenChoices.map(({ key, label }) => ({
              id: key,
              label,
              share: proportions.getProportion(key),
            }))}
            onChange={(shares) =>
              setProportions(
                proportions.withShares(
                  chosenChoices.map(({ key }) => key),
                  shares,
                ),
              )
            }
            onMoved={() => track("donation-split:changed", { how: "moved" })}
            locale={locale}
          />
          {texts.splitHint && (
            <p className="text-[13px] leading-[18px] text-slate-500">
              {texts.splitHint}
            </p>
          )}
        </div>
      )}
      {picked && pickedProportions && (
        <CharityPicker
          causeTitle={picked.title ?? ""}
          causeSlug={picked.slug}
          organizations={picked.organizations.filter(hasInternalId)}
          amount={
            amounts.causes.find(({ cause }) => cause.id === picked.id)
              ?.amount ?? 0
          }
          amountsFor={(subs) =>
            Object.fromEntries(
              (
                amountsByCause(
                  proportions.withSubProportions(picked.id, subs),
                  amount,
                  causes,
                  supportOrganization,
                ).causes.find(({ cause }) => cause.id === picked.id)
                  ?.organizations ?? []
              ).flatMap(({ organization, amount: part }) =>
                organization.internalId
                  ? [[organization.internalId, part]]
                  : [],
              ),
            )
          }
          proportions={pickedProportions}
          onConfirm={(subs) => {
            track("charity-picker:confirmed", {
              cause: causeName(picked),
              charities: subs.chosenKeys().length,
              fund_only: isFundOnly(picked, subs),
            });
            setProportions(proportions.withSubProportions(picked.id, subs));
            setPickerCause(null);
          }}
          onClose={() => setPickerCause(null)}
          money={money}
          texts={texts}
          locale={locale}
        />
      )}
    </fieldset>
  );
}
