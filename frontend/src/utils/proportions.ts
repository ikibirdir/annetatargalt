import { evenShares } from "./split";

export type ProportionKey = string | number;

export interface ProportionEntry {
  proportion: number;
  fund?: boolean | null;
  proportions?: Proportions;
}

/** A cause, or anything else chosen like one: support for the platform. */
export interface CauseData {
  id: ProportionKey;
  organizations: OrganizationData[];
}

interface OrganizationData {
  internalId: string | null;
  fund?: boolean | null;
}

interface AmountEntry {
  organizationInternalId: string;
  amount: number;
}

function requireEntry(
  entry: ProportionEntry | undefined,
  id: ProportionKey,
): ProportionEntry {
  if (!entry) throw new Error(`Proportions: key "${String(id)}" not found`);
  return entry;
}

function hasInternalId(
  org: OrganizationData,
): org is OrganizationData & { internalId: string } {
  return org.internalId !== null;
}

function requireSubProportions(
  entry: ProportionEntry,
  id: ProportionKey,
): Proportions {
  if (!entry.proportions)
    throw new Error(`Proportions: key "${String(id)}" has no sub-proportions`);
  return entry.proportions;
}

export default class Proportions {
  proportions: Map<ProportionKey, ProportionEntry>;

  constructor(entries: Array<[ProportionKey, Partial<ProportionEntry>]>) {
    const preparedEntries = entries.map(
      ([key, value]): [ProportionKey, ProportionEntry] => [
        key,
        {
          proportion: Math.floor(100 / entries.length),
          ...value,
        },
      ],
    );
    this.proportions = new Map(preparedEntries);
  }

  get(id: ProportionKey): ProportionEntry {
    return requireEntry(this.proportions.get(id), id);
  }

  getSub(id: ProportionKey, subId: ProportionKey): ProportionEntry {
    return requireEntry(
      requireSubProportions(this.get(id), id).proportions.get(subId),
      subId,
    );
  }

  getProportion(id: ProportionKey): number {
    return this.get(id).proportion;
  }

  getSubProportion(id: ProportionKey, subId: ProportionKey): number {
    return this.getSub(id, subId).proportion;
  }

  keys(): ProportionKey[] {
    return Array.from(this.proportions.keys());
  }

  entries(): Array<[ProportionKey, ProportionEntry]> {
    return Array.from(this.proportions.entries());
  }

  mapEntries(
    fun: (
      key: ProportionKey,
      value: ProportionEntry,
    ) => [ProportionKey, ProportionEntry],
  ): Proportions {
    return new Proportions(
      this.entries().map(([key, value]) => fun(key, value)),
    );
  }

  /** The keys with a share: the causes (or organizations) chosen. */
  chosenKeys(): ProportionKey[] {
    return this.keys().filter((key) => this.getProportion(key) > 0);
  }

  /**
   * `shares` given to `keys`, in that order, and 0 to every other key. Each
   * entry keeps the rest of itself: a cause, its organizations' split.
   */
  withShares(keys: ProportionKey[], shares: number[]): Proportions {
    return this.mapEntries((key, value) => {
      const index = keys.indexOf(key);
      return [
        key,
        {
          ...value,
          proportion: index === -1 ? 0 : (shares[index] ?? 0),
        },
      ];
    });
  }

  /** Only these keys chosen, split evenly in the list's order. */
  withEvenSplit(keys: ProportionKey[]): Proportions {
    const chosen = this.keys().filter((key) => keys.includes(key));
    return this.withShares(chosen, evenShares(chosen.length));
  }

  /**
   * The same split under other keys: a cause's id differs between languages,
   * so a kept draft names causes by something that doesn't.
   */
  renameKeys(rename: (key: ProportionKey) => ProportionKey): Proportions {
    return new Proportions(
      this.entries().map(([key, value]) => [rename(key), value]),
    );
  }

  /** A cause's split between its organizations, replaced. */
  withSubProportions(id: ProportionKey, proportions: Proportions): Proportions {
    return this.mapEntries((key, value) => [
      key,
      key === id ? { ...value, proportions } : value,
    ]);
  }

  toJSON(): Record<string, { proportion: number; proportions?: Proportions }> {
    return Object.fromEntries(
      this.entries()
        .map(
          ([key, value]) =>
            [
              key,
              { proportion: value.proportion, proportions: value.proportions },
            ] as const,
        )
        .filter(([_, value]) => value.proportion > 0),
    );
  }

  calculateAmounts(
    totalAmount: number,
    causes: { data: CauseData[] },
  ): AmountEntry[] {
    // In cents: each organization's exact share rounded down, and the cents
    // that leaves over handed out one each, the largest remainders first. So
    // the amounts add up to the total, and none is ever rounded down below
    // its share: one of a cent can't end at 0, which the backend refuses.
    const totalCents = Math.round(totalAmount * 100);
    const shares = causes.data.flatMap((cause) => {
      const causeProportion = this.getProportion(cause.id);
      return cause.organizations.filter(hasInternalId).map((organization) => {
        // In ten-thousandths of a cent: whole numbers, as the shares are
        // whole percents, so the remainders compare exactly.
        const share =
          totalCents *
          causeProportion *
          this.getSubProportion(cause.id, organization.internalId);
        const cents = Math.floor(share / 10000);
        return {
          organizationInternalId: organization.internalId,
          remainder: share - cents * 10000,
          cents,
          chosen: share > 0,
        };
      });
    });
    // Nothing chosen (the form's start) has nothing to hand out, and nowhere
    // to put it.
    const chosen = shares.filter((share) => share.chosen);
    let left = totalCents - chosen.reduce((sum, { cents }) => sum + cents, 0);
    // The largest remainders first, and the earlier ones of equals (a stable
    // sort); round again if the shares add up to less than the whole.
    const byRemainder = [...chosen].sort((a, b) => b.remainder - a.remainder);
    for (let i = 0; left > 0 && byRemainder.length > 0; i++, left--) {
      byRemainder[i % byRemainder.length].cents++;
    }
    // Shares adding up to more than the whole: cents back from the largest,
    // never below one.
    while (left < 0) {
      const largest = chosen.reduce(
        (max, share) => (share.cents > max.cents ? share : max),
        chosen[0],
      );
      if (largest.cents <= 1) break;
      largest.cents--;
      left++;
    }

    return chosen
      .filter(({ cents }) => cents > 0)
      .map(({ organizationInternalId, cents }) => ({
        organizationInternalId,
        amount: cents / 100,
      }));
  }

  /**
   * No cause chosen yet, as the donation form starts: every cause at 0%, each
   * with its fund ready at 100% for when it's chosen.
   */
  static fromStrapiDataNoneChosen(data: CauseData[]): Proportions {
    return Proportions.fromStrapiDataWithEqualProportions(data).mapEntries(
      (key, value) => [key, { ...value, proportion: 0 }],
    );
  }

  static fromStrapiDataWithEqualProportions(data: CauseData[]): Proportions {
    const equalProportions = data.map(
      (_, i) => Math.floor(100 / data.length) + (i < 100 % data.length ? 1 : 0),
    );

    return new Proportions(
      data.map((cause, causeIndex) => [
        cause.id,
        {
          proportion: equalProportions[causeIndex],
          // All of the cause's share to its fund, until the donor picks
          // charities of their own.
          proportions: new Proportions(
            cause.organizations.filter(hasInternalId).map((organization) => [
              organization.internalId,
              {
                proportion: organization.fund ? 100 : 0,
                fund: organization.fund,
              },
            ]),
          ),
        },
      ]),
    );
  }

  static fromStrapiData(
    data: CauseData[],
    chosenOrganizationInternalId?: string,
  ): Proportions {
    if (!chosenOrganizationInternalId) {
      return Proportions.fromStrapiDataWithEqualProportions(data);
    }

    // Check if organization exists
    const organizationExists = data.some((cause) =>
      cause.organizations.some(
        (organization) =>
          organization.internalId === chosenOrganizationInternalId,
      ),
    );

    if (!organizationExists) {
      // Organization not found, fall back to equal proportions
      return Proportions.fromStrapiDataWithEqualProportions(data);
    }

    const preChosenProportions = data.map((cause) =>
      cause.organizations.find(
        (organization) =>
          organization.internalId === chosenOrganizationInternalId,
      )
        ? 100
        : 0,
    );

    function calculateProportion(
      isInCause: boolean,
      isChosenOrganization: boolean,
      isFund: boolean | null | undefined,
    ): number {
      if (isInCause) {
        if (isChosenOrganization) return 100;
        return 0;
      }

      if (isFund) return 100;
      return 0;
    }

    return new Proportions(
      data.map((cause, causeIndex) => [
        cause.id,
        {
          proportion: preChosenProportions[causeIndex],
          proportions: new Proportions(
            cause.organizations.filter(hasInternalId).map((organization) => [
              organization.internalId,
              {
                proportion: calculateProportion(
                  preChosenProportions[causeIndex] === 100,
                  organization.internalId === chosenOrganizationInternalId,
                  organization.fund,
                ),
                fund: organization.fund,
              },
            ]),
          ),
        },
      ]),
    );
  }
}
