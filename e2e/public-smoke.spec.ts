import { expect, test } from "@playwright/test";

test.describe("public smoke routes", () => {
  test.afterEach(async ({ context }) => {
    await context.close();
  });

  test("home page renders ProjectMatch and public entry points", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1, name: "ProjectMatch" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Submit project request" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Apply as provider" }),
    ).toBeVisible();
  });

  test("project request form renders without submitting", async ({ page }) => {
    await page.goto("/request");

    await expect(
      page.getByRole("heading", { name: "Tell us what you want to build." }),
    ).toBeVisible();
    await expect(page.getByLabel("Name")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Submit project request" }),
    ).toBeVisible();
  });

  test("provider application form renders without submitting", async ({
    page,
  }) => {
    await page.goto("/provider/apply");

    await expect(
      page.getByRole("heading", { name: "Share the work you can take on." }),
    ).toBeVisible();
    await expect(page.getByLabel("Name or display name")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Submit provider application" }),
    ).toBeVisible();
  });

  test("admin login renders without authenticating", async ({ page }) => {
    await page.goto("/admin/login");

    await expect(
      page.getByRole("heading", { name: "Sign in" }),
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("student engagement route handles an invalid bearer token safely", async ({
    page,
  }) => {
    await page.goto("/engagement/status?token=invalid-test-token");

    await expect(
      page.getByRole("heading", { name: "Engagement unavailable" }),
    ).toBeVisible();
    await expect(
      page.getByText("This engagement link is invalid."),
    ).toBeVisible();
  });

  test("provider engagement route handles an invalid bearer token safely", async ({
    page,
  }) => {
    await page.goto("/engagement/provider?token=invalid-test-token");

    await expect(
      page.getByRole("heading", { name: "Engagement unavailable" }),
    ).toBeVisible();
    await expect(
      page.getByText("This engagement link is invalid."),
    ).toBeVisible();
  });
});
