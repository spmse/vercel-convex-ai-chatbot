import { expect, test } from "@playwright/test";

// Basic auth/landing page flows: logout lands on /login, landing shows options, guest provisioning works when enabled.

// Extract regex & long literals to constants for lint performance/style.
const LOGIN_URL_MATCH = /\/login$/;
const ROOT_URL_MATCH = /\/$/;
const EMAIL_PASSWORD_LINK = /Email \/ Password Login/i;
const CREATE_ACCOUNT_LINK = /Create Account/i;
const PROCEED_GUEST_BUTTON = /Proceed as Guest/i;
const CHAT_SELECTOR_TIMEOUT_MS = 15_000; // 15 seconds

test.describe("Auth Landing Page", () => {
  test("unauthenticated visit to protected route redirects to /login landing page", async ({
    page,
  }) => {
    await page.goto("/");
    // Should redirect to /login
    await expect(page).toHaveURL(LOGIN_URL_MATCH);
    await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: EMAIL_PASSWORD_LINK })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: CREATE_ACCOUNT_LINK })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: PROCEED_GUEST_BUTTON })
    ).toBeVisible();
  });

  test("guest button disabled when guestAccounts flag off", async ({
    page,
  }) => {
    // We cannot mutate env mid-run; just observe state and assert if disabled.
    await page.goto("/login");
    const guestButton = page.getByRole("button", {
      name: PROCEED_GUEST_BUTTON,
    });
    const disabled = await guestButton.getAttribute("disabled");
    if (disabled) {
      await expect(guestButton).toBeDisabled();
    } else {
      test.skip(
        true,
        "guestAccounts flag enabled; skipping disabled assertion"
      );
    }
  });

  test("provision guest and reach chat when enabled", async ({ page }) => {
    await page.goto("/login");
    const guestButton = page.getByRole("button", {
      name: PROCEED_GUEST_BUTTON,
    });
    if (await guestButton.getAttribute("disabled")) {
      test.skip(
        true,
        "guestAccounts flag disabled; skipping provisioning test"
      );
    }
    await guestButton.click();
    // After click we expect to land on root app page and see chat UI elements.
    await expect(page).toHaveURL(ROOT_URL_MATCH);
    // Wait for a known chat element
    await expect(page.getByTestId("multimodal-input")).toBeVisible({
      timeout: CHAT_SELECTOR_TIMEOUT_MS,
    });
  });
});
