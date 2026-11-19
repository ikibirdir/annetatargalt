import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
  form,
  fillDetails,
  payAtBank,
  shareOf,
  toPayment,
} from "../../helpers/donation.ts";
import {
  emailsTo,
  orderOnPage,
  uniqueEmail,
  waitForEmail,
} from "../../helpers/fakes.ts";
import { CAUSES, DONATION_INFO, ORGS, TEXT } from "../../stack/content.ts";
import { choose, clickToOpen } from "../../helpers/page.ts";

const HEALTH = CAUSES.health.title;
const CLIMATE = CAUSES.climate.title;

/** Moves the split bar's first border this many percent to the right. */
async function moveFirstBorder(page: Page, percent: number) {
  const border = form(page).borders.first();
  await border.focus();
  for (let i = 0; i < percent; i++) await border.press("ArrowRight");
}

test.describe("one-off donation", () => {
  test("is paid at the bank, thanked for and confirmed by email", async ({
    page,
  }) => {
    const email = uniqueEmail();
    await page.goto("/anneta");
    await expect(
      page.getByRole("heading", { name: TEXT.donateTitle }),
    ).toBeVisible();

    await toPayment(page, {
      firstName: "Mari",
      lastName: "Maasikas",
      email,
    });
    const f = form(page);
    // Both causes ticked: split evenly between their funds.
    await expect(f.summary).toContainText(ORGS.fund.title);
    await expect(f.summary).toContainText(ORGS.climateFund.title);
    await expect(f.summary).toContainText("30,00€");

    await expect(f.donate).toBeDisabled();
    await f.terms.check();
    await f.donate.click();

    await expect(page.getByTestId("amount")).toHaveText("30.00 EUR");
    await payAtBank(page);

    await page.waitForURL("**/aitah?order-token=*");
    await expect(
      page.getByRole("heading", { name: "Thank you, Mari!" }),
    ).toBeVisible();
    await expect(page.getByText("You gave 30.")).toBeVisible();

    const confirmation = await waitForEmail(email, TEXT.confirmationSubject);
    expect(confirmation.text).toContain("Dear Mari, you gave 30 €.");
    expect(confirmation.text).toContain(`${ORGS.fund.title}: 15€`);
    expect(confirmation.text).toContain(`${ORGS.climateFund.title}: 15€`);
    expect(confirmation.text).toMatch(/api\/email-settings\?locale=et#token=/);
  });

  test("with another amount and support for the platform on top", async ({
    page,
  }) => {
    const email = uniqueEmail();
    await page.goto("/anneta");
    const f = form(page);
    await choose(f.single);
    await choose(f.otherAmount);
    await f.otherAmountInput.fill("40");
    await choose(f.choice(HEALTH));
    // The way to more than 5% shows once the box is ticked.
    await expect(f.tipMore).toHaveCount(0);
    await choose(f.tip);
    await expect(f.tipMore).toBeVisible();

    // 5% on top, to the platform: the cause keeps all of the amount.
    await expect.poll(() => shareOf(page, HEALTH)).toBe("100%");
    await expect(f.summary).toContainText(ORGS.tip.title);
    await expect(f.summary).toContainText("+2,00€");
    await expect(f.summary).toContainText("42,00€");

    await f.next.click();
    await fillDetails(page, { firstName: "Tõnu", lastName: "Tipp", email });
    await f.terms.check();
    await f.donate.click();
    await expect(page.getByTestId("amount")).toHaveText("42.00 EUR");
    await payAtBank(page);
    await expect(
      page.getByRole("heading", { name: /Thank you, Tõnu/ }),
    ).toBeVisible();

    const confirmation = await waitForEmail(email, TEXT.confirmationSubject);
    expect(confirmation.text).toContain(`${ORGS.fund.title}: 40€`);
    expect(confirmation.text).toContain(`${ORGS.tip.title}: 2€`);
  });

  test("by card", async ({ page }) => {
    await page.goto("/anneta");
    await toPayment(page, {
      firstName: "Kaarel",
      lastName: "Kaart",
      email: uniqueEmail(),
    });
    const f = form(page);
    await f.card.check();
    await f.terms.check();
    await f.donate.click();
    await page.waitForURL("**/pay/**");
    const order = await orderOnPage(page.url());
    expect(order?.method).toBe("cardPayments");
    await payAtBank(page);
    await expect(
      page.getByRole("heading", { name: /Thank you, Kaarel/ }),
    ).toBeVisible();
  });

  test("in someone's name emails them too", async ({ page }) => {
    const donor = uniqueEmail();
    const friend = uniqueEmail("friend");
    await page.goto("/anneta");
    await toPayment(page, {
      firstName: "Anu",
      lastName: "Andja",
      email: donor,
    });
    const f = form(page);
    await f.dedicate.check();
    await f.dedicationName.fill("Sõber");
    await f.dedicationEmail.fill(friend);
    await f.dedicationMessage.fill("Palju õnne!");
    await f.terms.check();
    await f.donate.click();
    await payAtBank(page);
    await expect(
      page.getByRole("heading", { name: /Thank you, Anu/ }),
    ).toBeVisible();

    await waitForEmail(donor, TEXT.confirmationSubject);
    await waitForEmail(friend, TEXT.dedicationSubject);
  });

  test("as a company", async ({ page }) => {
    await page.goto("/anneta");
    await toPayment(page, {
      firstName: "Fiona",
      lastName: "Firma",
      email: uniqueEmail(),
    });
    const f = form(page);
    await f.terms.check();
    await f.company.check();
    await expect(f.donate).toBeDisabled();
    await f.companyName.fill("Näide OÜ");
    await f.companyCode.fill("12345678");
    await expect(f.donate).toBeEnabled();
    await f.donate.click();
    await payAtBank(page);
    await expect(
      page.getByRole("heading", { name: /Thank you, Fiona/ }),
    ).toBeVisible();
  });

  test("left unpaid at the bank isn't thanked for or confirmed", async ({
    page,
  }) => {
    const email = uniqueEmail();
    await page.goto("/anneta");
    await toPayment(page, {
      firstName: "Pille",
      lastName: "Poolik",
      email,
    });
    const f = form(page);
    await f.terms.check();
    await f.donate.click();
    await payAtBank(page, "abandon");

    // The thank-you page sends a donation it can't confirm to the front page.
    await page.waitForURL((url) => url.pathname === "/");
    await expect(
      page.getByRole("heading", { name: TEXT.heroTitle }),
    ).toBeVisible();
    // The confirmation goes out with the notification, before the redirect.
    expect(await emailsTo(email)).toHaveLength(0);
  });
});

test.describe("where the donation goes", () => {
  test("starts with nothing chosen, and goes on once a cause is", async ({
    page,
  }) => {
    await page.goto("/anneta");
    const f = form(page);
    await expect(f.choice(HEALTH)).not.toBeChecked();
    await expect(f.next).toBeDisabled();
    await expect(f.summary).toContainText("Choose cause text");

    await choose(f.choice(HEALTH));
    await expect.poll(() => shareOf(page, HEALTH)).toBe("100%");
    await expect(f.next).toBeEnabled();
    // All of it to the cause's fund, as it starts.
    await expect(f.summary).toContainText(ORGS.fund.title);
    await expect(
      page.getByText(`${CAUSES.climate.title} in one line.`),
    ).toBeVisible();
  });

  test("goes to the cause's fund unless the donor picks charities", async ({
    page,
  }) => {
    await page.goto("/anneta");
    const f = form(page);
    await choose(f.single);
    await choose(f.choice(HEALTH));
    await f.specify(HEALTH).click();

    const charities = page.getByRole("dialog");
    await expect(
      charities.getByRole("checkbox", { name: /^Example Fund/ }),
    ).toBeChecked();
    await expect(
      charities.getByText(`${ORGS.alpha.title} in one line.`),
    ).toBeVisible();
    // An organization that takes no donations isn't offered.
    await expect(charities.getByText(ORGS.dormant.title)).toHaveCount(0);
    await choose(charities.getByRole("checkbox", { name: /^Alpha Aid/ }));
    await charities
      .getByRole("button", { name: "Charities confirm text" })
      .click();
    await expect(charities).toBeHidden();

    // Split evenly between the fund and the charity picked.
    await expect(f.summary).toContainText(ORGS.alpha.title);
    await expect(f.summary).toContainText("15,00€");

    await f.next.click();
    await fillDetails(page, {
      firstName: "Valve",
      lastName: "Valik",
      email: uniqueEmail(),
    });
    await f.terms.check();
    const sent = page.waitForRequest((request) =>
      request.url().endsWith("/api/donate"),
    );
    await f.donate.click();
    const donation = (await sent).postDataJSON();
    expect(donation.amount).toBe(3000);
    expect(donation.amounts).toEqual(
      expect.arrayContaining([
        { organizationInternalId: ORGS.fund.internalId, amount: 1500 },
        { organizationInternalId: ORGS.alpha.internalId, amount: 1500 },
      ]),
    );
    expect(donation.amounts).toHaveLength(2);
  });

  test("offers a bigger share for the platform, or one of the donor's own", async ({
    page,
  }) => {
    await page.goto("/anneta");
    const f = form(page);
    await choose(f.single);
    await choose(f.choice(HEALTH));
    await choose(f.tip);
    await f.tipMore.click();

    const shares = page.getByRole("dialog", { name: "Support the platform" });
    const confirm = shares.getByRole("button", {
      name: "Charities confirm text",
    });
    await expect(shares.getByRole("radio", { name: /^5%/ })).toBeChecked();
    await choose(shares.getByRole("radio", { name: /^10%/ }));
    await confirm.click();
    await expect(shares).toBeHidden();
    // 10% of 30
    await expect(f.summary).toContainText("+3,00€");
    await expect(f.summary).toContainText("33,00€");

    await f.tipMore.click();
    await choose(
      shares.getByRole("radio", { name: "Other amount option text" }),
    );
    const own = shares.getByRole("textbox", { name: "Protsent" });
    await own.fill("0");
    await expect(confirm).toBeDisabled();
    await own.fill("7,5");
    await expect(confirm).toBeEnabled();
    await confirm.click();
    await expect(f.summary).toContainText("+2,25€");
    await expect(f.summary).toContainText("32,25€");

    await f.next.click();
    await fillDetails(page, {
      firstName: "Toomas",
      lastName: "Toetaja",
      email: uniqueEmail(),
    });
    await f.terms.check();
    const sent = page.waitForRequest((request) =>
      request.url().endsWith("/api/donate"),
    );
    await f.donate.click();
    const donation = (await sent).postDataJSON();
    expect(donation.amount).toBe(3225);
    expect(donation.amounts).toEqual(
      expect.arrayContaining([
        { organizationInternalId: ORGS.fund.internalId, amount: 3000 },
        { organizationInternalId: ORGS.tip.internalId, amount: 225 },
      ]),
    );
    expect(donation.amounts).toHaveLength(2);
  });

  test("lets the donor adjust the split, and start it over", async ({
    page,
  }) => {
    await page.goto("/anneta");
    const f = form(page);
    await choose(f.choice(HEALTH));
    await choose(f.choice(CLIMATE));
    await expect(f.splitEvenly).toHaveCount(0);
    await moveFirstBorder(page, 20);
    await expect(f.borders.first()).toHaveAttribute(
      "aria-valuetext",
      `${HEALTH} 70%, ${CLIMATE} 30%`,
    );
    await expect.poll(() => shareOf(page, HEALTH)).toBe("70%");
    await expect(f.summary).toContainText("21,00€");

    await f.splitEvenly.click();
    await expect.poll(() => shareOf(page, HEALTH)).toBe("50%");
    await expect.poll(() => shareOf(page, CLIMATE)).toBe("50%");
    await expect(f.splitEvenly).toHaveCount(0);
  });
});

test.describe("the form", () => {
  test("won't donate without a valid email or ID code", async ({ page }) => {
    await page.goto("/anneta");
    await toPayment(page, {
      firstName: "Vale",
      lastName: "Vorm",
      email: "not-an-email",
    });
    const f = form(page);
    await f.terms.check();
    await expect(f.donate).toBeDisabled();
    await f.email.fill(uniqueEmail());
    await expect(f.donate).toBeEnabled();

    // An Estonian ID code has a check digit.
    await f.idCode.fill("37605030298");
    await expect(f.donate).toBeDisabled();
    await f.idCode.fill("37605030299");
    await expect(f.donate).toBeEnabled();
  });

  test("won't take zero as another amount", async ({ page }) => {
    await page.goto("/anneta");
    const f = form(page);
    await choose(f.choice(HEALTH));
    await choose(f.otherAmount);
    await f.otherAmountInput.fill("0");
    await expect(f.next).toBeDisabled();
    await f.otherAmountInput.fill("25");
    await expect(f.next).toBeEnabled();
  });

  test("keeps a draft through a reload", async ({ page }) => {
    await page.goto("/anneta");
    const f = form(page);
    await choose(f.single);
    await choose(f.amount(60));
    await choose(f.choice(HEALTH));
    await choose(f.tip);
    await f.next.click();
    await f.firstName.fill("Mälu");
    await page.reload();

    await expect(f.firstName).toHaveValue("Mälu");
    await f.editDonation.click();
    await expect(f.amount(60)).toBeChecked();
    await expect(f.single).toBeChecked();
    await expect(f.choice(HEALTH)).toBeChecked();
    await expect(f.tip).toBeChecked();
  });

  test("keeps the split through a change of language", async ({ page }) => {
    await page.goto("/anneta");
    const f = form(page);
    await choose(f.choice(HEALTH));
    await choose(f.choice(CLIMATE));
    await moveFirstBorder(page, 20);
    await expect(f.borders.first()).toHaveAttribute(
      "aria-valuetext",
      `${HEALTH} 70%, ${CLIMATE} 30%`,
    );

    const english = page.getByRole("menuitem", { name: "English" });
    await clickToOpen(
      page.getByRole("button", { name: "Keel: Eesti" }).first(),
      english,
    );
    await english.click();
    await page.waitForURL("**/en/donate");
    await expect(f.choice(CAUSES.health.enTitle)).toBeChecked();
    await expect(f.borders.first()).toHaveAttribute(
      "aria-valuetext",
      `${CAUSES.health.enTitle} 70%, ${CAUSES.climate.enTitle} 30%`,
    );
  });

  test("starts one-off from a link that says so", async ({ page }) => {
    await page.goto("/anneta?type=onetime");
    await expect(form(page).single).toBeChecked();
  });

  test("starts with the organization a link names", async ({ page }) => {
    await page.goto(`/anneta?org=${ORGS.alpha.internalId}`);
    const f = form(page);
    // The link's organization gets it all.
    await expect(f.choice(HEALTH)).toBeChecked();
    await expect.poll(() => shareOf(page, HEALTH)).toBe("100%");
    await expect(f.choice(CLIMATE)).not.toBeChecked();
    await expect(f.summary).toContainText(ORGS.alpha.title);

    await f.editCharities(HEALTH).click();
    const charities = page.getByRole("dialog");
    await expect(
      charities.getByRole("checkbox", { name: /^Alpha Aid/ }),
    ).toBeChecked();
    await expect(
      charities.getByRole("checkbox", { name: /^Example Fund/ }),
    ).not.toBeChecked();
    await expect(charities.getByText(ORGS.dormant.title)).toHaveCount(0);
  });

  test("reports the backend's refusal", async ({ page }) => {
    await page.route("**/api/donate", (route) =>
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: { status: 400, message: "Amount must be smaller" },
        }),
      }),
    );
    await page.goto("/anneta");
    await toPayment(page, {
      firstName: "Viga",
      lastName: "Vastus",
      email: uniqueEmail(),
    });
    const f = form(page);
    await f.terms.check();
    await f.donate.click();
    await expect(page.getByRole("dialog")).toContainText("Error text");
  });
});

test.describe("monthly donation", () => {
  test("with another bank shows how to set up the standing order", async ({
    page,
  }) => {
    await page.goto("/anneta");
    const f = form(page);
    await expect(f.recurring).toBeChecked();
    await choose(f.amount(10));
    await choose(f.choice(HEALTH));
    await f.next.click();
    await fillDetails(page, {
      firstName: "Kuu",
      lastName: "Kaupa",
      email: uniqueEmail(),
    });
    await f.terms.check();
    // A monthly donation needs a bank.
    await expect(f.donate).toBeDisabled();
    await choose(f.otherBank);
    await f.donate.click();

    await expect(
      page.getByText("Set up a standing order of 10€."),
    ).toBeVisible();
  });

  test("with a bank sends the donor to its standing order page", async ({
    page,
  }) => {
    // The bank's own page is outside the test; it's enough that we go there.
    await page.route("https://www.swedbank.ee/**", (route) =>
      route.fulfill({ body: "Swedbank standing order" }),
    );
    await page.goto("/anneta");
    const f = form(page);
    await choose(f.choice(HEALTH));
    await f.next.click();
    await fillDetails(page, {
      firstName: "Pank",
      lastName: "Link",
      email: uniqueEmail(),
    });
    await f.terms.check();
    await choose(page.getByRole("radio", { name: "swedbank" }));
    await f.donate.click();
    await page.waitForURL(/swedbank\.ee/);
    const order = new URL(page.url()).searchParams;
    expect(order.get("standingOrder.amount")).toBe("30");
    expect(order.get("standingOrder.beneficiaryAccountNumber")).toBe(
      DONATION_INFO.iban,
    );
    expect(order.get("standingOrder.beneficiaryName")).toBe(
      DONATION_INFO.recipient,
    );
  });
});
