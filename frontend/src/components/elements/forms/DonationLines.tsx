import type Proportions from "@/utils/proportions";
import type { StrapiCause } from "@/types/generated/strapi";
import { amountsByCause } from "@/utils/donation-amounts";
import { classes } from "@/utils/react";

interface DonationLinesProps {
  amount: number;
  proportions: Proportions;
  causes: { data: StrapiCause[] };
  tipOrganization: string | null;
  tipAmount: number;
  money: (amount: number) => string;
  /** Instead of the lines while no cause is chosen: "Nothing selected". */
  emptyText: string | null;
  className?: string;
}

/**
 * The donation line by line: each chosen cause with its amount and the
 * organizations it goes to (each with its own amount when there are several),
 * and the support for the platform when added.
 */
export default function DonationLines({
  amount,
  proportions,
  causes,
  tipOrganization,
  tipAmount,
  money,
  emptyText,
  className,
}: DonationLinesProps) {
  // Support isn't one of the choices here: it's added on top, its own line.
  const lines = amountsByCause(proportions, amount, causes, null).causes.filter(
    (line) => line.amount > 0,
  );

  return (
    <ul
      className={classes(
        "divide-y divide-slate-200 text-sm leading-5",
        className ?? "",
      )}
    >
      {lines.length === 0 && (
        <li className="py-3 text-slate-500">{emptyText}</li>
      )}
      {lines.map(({ cause, amount: causeAmount, organizations }) => (
        <li key={cause.id} className="py-3">
          <div className="flex justify-between gap-3 font-medium text-slate-900">
            <span>{cause.title}</span>
            <span className="whitespace-nowrap">{money(causeAmount)}</span>
          </div>
          <ul className="mt-1 flex flex-col gap-0.5 text-slate-500">
            {organizations.map(({ organization, amount: part }) => (
              <li
                key={organization.internalId}
                className="flex justify-between gap-3"
              >
                <span className="min-w-0">{organization.title}</span>
                {/* One organization's amount is the cause's, shown above. */}
                {organizations.length > 1 && (
                  <span className="whitespace-nowrap">{money(part)}</span>
                )}
              </li>
            ))}
          </ul>
        </li>
      ))}
      {tipAmount > 0 && (
        <li className="flex justify-between gap-3 py-3 font-medium text-slate-900">
          <span>{tipOrganization}</span>
          <span className="whitespace-nowrap">{money(tipAmount)}</span>
        </li>
      )}
    </ul>
  );
}
