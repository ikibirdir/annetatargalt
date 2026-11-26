import { describe, expect, it } from "vitest";
import Proportions from "../proportions";
import {
  SUPPORT_KEY,
  causeName,
  isFundOnly,
  splitChoices,
  splitFacts,
} from "../donation-amounts";

const health = {
  id: 1,
  documentId: "health",
  organizations: [
    { internalId: "AMF", fund: false },
    { internalId: "GW-TCF", fund: true },
    { internalId: "MC", fund: false },
  ],
};
const animals = {
  id: 2,
  documentId: "animals",
  organizations: [
    { internalId: "ACE-RCF", fund: true },
    { internalId: "GFI", fund: false },
  ],
};
const causes = { data: [health, animals] };
const supportOrganization = "AT";

/** The form as it starts: nothing chosen, each cause's fund ready. */
const none = () =>
  Proportions.fromStrapiDataNoneChosen(
    splitChoices(causes, supportOrganization).data,
  );

/** Health's split between its organizations, as the charity picker gives it. */
const healthSplit = (keys: string[], shares: number[]) =>
  new Proportions(
    health.organizations.map(({ internalId }) => [internalId, {}]),
  ).withShares(keys, shares);

describe("causeName", () => {
  it("names a cause by its fund, the same in both languages", () => {
    expect(causeName(health)).toBe("GW-TCF");
  });

  it("names one without a fund by its first organization", () => {
    expect(
      causeName({
        ...health,
        organizations: health.organizations.map((organization) => ({
          ...organization,
          fund: false,
        })),
      }),
    ).toBe("AMF");
  });

  it("names one without organizations by its document id", () => {
    expect(causeName({ ...health, organizations: [] })).toBe("health");
  });
});

describe("isFundOnly", () => {
  it("is so for the fund alone", () => {
    expect(isFundOnly(health, healthSplit(["GW-TCF"], [100]))).toBe(true);
  });

  it("isn't for another organization, or the fund with others", () => {
    expect(isFundOnly(health, healthSplit(["AMF"], [100]))).toBe(false);
    expect(isFundOnly(health, healthSplit(["GW-TCF", "MC"], [50, 50]))).toBe(
      false,
    );
  });
});

describe("splitFacts", () => {
  const facts = (proportions: Proportions) =>
    splitFacts(proportions, causes, supportOrganization);

  it("counts a cause to its fund, as the form starts it", () => {
    expect(facts(none().withShares([1], [100]))).toEqual({
      causes: 1,
      charities: 1,
      fund_only: true,
      custom_split: false,
    });
  });

  it("leaves support out of the causes, and its 5% isn't a split moved", () => {
    expect(facts(none().withShares([1, 2, SUPPORT_KEY], [48, 47, 5]))).toEqual({
      causes: 2,
      charities: 2,
      fund_only: true,
      custom_split: false,
    });
  });

  it("tells a split moved from the one it starts with", () => {
    expect(facts(none().withShares([1, 2], [70, 30])).custom_split).toBe(true);
  });

  it("counts the charities picked for a cause", () => {
    const picked = none()
      .withShares([1, 2], [50, 50])
      .withSubProportions(1, healthSplit(["AMF", "MC"], [50, 50]));

    expect(facts(picked)).toMatchObject({
      causes: 2,
      charities: 3,
      fund_only: false,
    });
  });

  it("has no causes, nor just funds, for support alone", () => {
    expect(facts(none().withShares([SUPPORT_KEY], [100]))).toEqual({
      causes: 0,
      charities: 0,
      fund_only: false,
      custom_split: false,
    });
  });
});
