import { expect, type Page } from "@playwright/test";

/** Page-object-lite for the Catalog screen (ui-spec §2). */
export class CatalogPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/catalog");
  }

  heading() {
    return this.page.getByRole("heading", { name: "Equipment Catalog" });
  }

  /** The visible detail link for an item (mobile card or desktop table row). */
  itemLink(name: string) {
    return this.page.locator(`a[aria-label="View ${name}"]:visible`).first();
  }

  /** Account menu trigger shows the current username (ui-spec §2.2). */
  accountTrigger(username: string) {
    return this.page.getByRole("button", { name: new RegExp(username) });
  }

  mobileCardList() {
    return this.page.locator("div.md\\:hidden a[aria-label^='View ']");
  }

  desktopTable() {
    return this.page.locator("table");
  }

  async signOut(username: string) {
    await this.accountTrigger(username).click();
    await this.page.getByRole("menuitem", { name: "Sign out" }).click();
  }

  async expectLoaded() {
    await expect(this.heading()).toBeVisible();
    // Both responsive surfaces render every item (mobile cards + desktop
    // table) — assert on the VISIBLE surface for the current viewport.
    await expect(
      this.page.getByText("Synthetic single-unit fixture").filter({ visible: true }).first(),
    ).toBeVisible();
  }

  async expectResponsiveSurfaces(viewportWidth: number) {
    if (viewportWidth < 768) {
      await expect(this.mobileCardList().first()).toBeVisible();
      await expect(this.desktopTable()).toBeHidden();
    } else {
      await expect(this.desktopTable()).toBeVisible();
      await expect(this.mobileCardList().first()).toBeHidden();
    }
  }
}
