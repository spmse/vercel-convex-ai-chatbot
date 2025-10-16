import { test, expect } from "@playwright/test";
import { generateId } from "ai";

// Regex & constants for lint performance.
const LOGIN_URL_MATCH = /\/login$/;
const MULTIMODAL_INPUT_TESTID = "multimodal-input";

function uniqueEmail() {
  return `playwright-${Date.now()}-${generateId()}@example.com`;
}

const PASSWORD = "Passw0rd!";

async function registerViaUI(page: import('@playwright/test').Page) {
  await page.goto("/register");
  const email = uniqueEmail();
  await page.getByPlaceholder("user@acme.com").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign Up" }).click();
  await expect(page.getByTestId("toast")).toContainText("Account created successfully!");
  // Wait for chat UI to appear
  await expect(page.getByTestId(MULTIMODAL_INPUT_TESTID)).toBeVisible();
  return email;
}

test.describe("Logout Flow", () => {
  test("signing out redirects to /login and prevents further access", async ({ page }) => {
    await registerViaUI(page);

    // Open user nav & click sign out (uses menu item text 'Sign out').
    const userNavButton = page.getByTestId("user-nav-button");
    await userNavButton.click();
    const authMenuItem = page.getByTestId("user-nav-item-auth");
    await expect(authMenuItem).toBeVisible();
    await authMenuItem.click();

    // After sign out we should be on /login landing page.
    await expect(page).toHaveURL(LOGIN_URL_MATCH);
    await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();

    // Attempt to visit root again; should stay/redirect to /login.
    await page.goto("/");
    await expect(page).toHaveURL(LOGIN_URL_MATCH);
  });
});
