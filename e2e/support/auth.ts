import { expect, type Page } from "@playwright/test";

export async function loginAs(
  page: Page,
  credentials: {
    email: string;
    password: string;
  },
  next = "/app",
) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email").fill(credentials.email);
  await page.getByLabel("Password").fill(credentials.password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(new RegExp(`${next.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
}
