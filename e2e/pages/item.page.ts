import { expect, type Page } from "@playwright/test";

/** Page-object-lite for the Item Detail screen (ui-spec §3). */
export class ItemDetailPage {
  constructor(private readonly page: Page) {}

  async goto(id: string) {
    await this.page.goto(`/items/${id}`);
  }

  itemName(name: string) {
    return this.page.getByRole("heading", { name });
  }

  badge(text: "AVAILABLE" | "UNAVAILABLE") {
    return this.page.getByText(text, { exact: true });
  }

  backLink() {
    return this.page.getByRole("link", { name: "Back to catalog" });
  }

  missingMessage() {
    return this.page.getByText("Item not found.");
  }

  async expectInfo(name: string) {
    await expect(this.itemName(name)).toBeVisible();
    await expect(this.page.getByText("Test fixture").first()).toBeVisible();
  }

  async backToCatalog() {
    await this.backLink().first().click();
    await expect(this.page.getByRole("heading", { name: "Equipment Catalog" })).toBeVisible();
  }
}
