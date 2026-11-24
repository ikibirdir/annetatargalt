import { classes } from "@/utils/react";
import { Label, Radio, RadioGroup } from "@headlessui/react";
import Image from "../Image";
import type { StrapiBankIcon } from "@/types/generated/strapi";

interface BankChooserOptionProps {
  value: string;
  label: string | null;
  icon?: StrapiBankIcon["icon"];
}

/**
 * A bank as the live site has it: its logo fills the tile (LHV's black and
 * SEB's green are part of their logos), and a bank without one, "Other bank",
 * is its name. The tiles are the logos' shape, 5:2, so they show whole.
 */
function BankChooserOption({ value, label, icon }: BankChooserOptionProps) {
  return (
    <Radio
      value={value}
      className={({ checked }) =>
        classes(
          // Chosen: the cause cards' green edge, drawn over the logo so it
          // shows on it, on top of the border.
          checked
            ? "border-primary-600 bg-primary-50 after:absolute after:inset-0 after:rounded-[7px] after:ring-1 after:ring-primary-600 after:ring-inset"
            : "border-slate-400 bg-white",
          // From the keyboard, an outline around it: the logo covers its
          // inside.
          "relative flex aspect-[5/2] cursor-pointer items-center justify-center overflow-hidden rounded-lg border text-slate-900 shadow-xs outline-hidden data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-primary-600 data-focus:outline-solid",
        )
      }
    >
      {icon && (
        <Image
          data={icon}
          fill={true}
          // A tile is at most about 18rem wide: two in a row in a column
          // just short of four's room.
          sizes="18rem"
          className="cursor-pointer object-cover"
        />
      )}
      <Label className={icon ? "sr-only" : "cursor-pointer text-sm"}>
        {label}
      </Label>
    </Radio>
  );
}

interface BankChooserProps {
  bankText: string | null;
  otherBankText: string | null;
  banks: StrapiBankIcon[];
  bank: string;
  setBank: (bank: string) => void;
}

export default function BankChooser({
  bankText,
  otherBankText,
  banks,
  bank,
  setBank,
}: BankChooserProps) {
  return (
    // Four in a row only where there's room for them, by the space it has
    // rather than the screen's: beside the form, the column is narrow.
    <RadioGroup value={bank} onChange={setBank} className="@container">
      <Label className="mb-2 block text-sm leading-6 font-medium text-slate-900">
        {bankText}
      </Label>
      <div className="grid grid-cols-2 gap-3 @xl:grid-cols-4">
        {banks
          .filter((b): b is typeof b & { bank: string } => b.bank !== null)
          .map(({ bank, icon }) => (
            <BankChooserOption
              key={bank}
              value={bank}
              label={bank}
              icon={icon}
            />
          ))}
        <BankChooserOption value="other" label={otherBankText} />
      </div>
    </RadioGroup>
  );
}
