import { expect, type Page } from "@playwright/test";
import type { Account } from "./fixtures";

/** Page-object-lite for the Login screen (ui-spec §1). */
export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/login");
  }

  async signIn(account: Account) {
    await this.fillCredentials(account);
    await this.page.getByRole("button", { name: "Sign in" }).click();
    // Wait for the login round-trip to complete so the session cookie is set
    // before the test navigates again (a hard goto cancels in-flight fetches).
    await this.page.waitForURL(/\/catalog/);
  }

  /** Fill + submit WITHOUT waiting for success — for negative login cases. */
  async signInExpectingFailure(account: Account) {
    await this.fillCredentials(account);
    await this.page.getByRole("button", { name: "Sign in" }).click();
  }

  private async fillCredentials(account: Account) {
    // exact: true distinguishes the labelled inputs from the "Show password"
    // toggle button whose aria-label also contains "Password".
    await this.page.getByLabel("Username", { exact: true }).fill(account.username);
    await this.page.getByLabel("Password", { exact: true }).fill(account.password);
  }

  usernameField() {
    return this.page.getByLabel("Username", { exact: true });
  }

  passwordField() {
    return this.page.getByLabel("Password", { exact: true });
  }

  errorMessage() {
    return this.page.getByRole("alert");
  }

  async expectLoaded() {
    await expect(this.page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(this.page.getByText("D.I.Y. Room Equipment Borrowing System")).toBeVisible();
  }
}
