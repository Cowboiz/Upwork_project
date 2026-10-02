import { expect, test } from "@playwright/test";

test.describe("public smoke routes", () => {
  test.afterEach(async ({ context }) => {
    await context.close();
  });

  test("health endpoint reports liveness without dependency checks", async ({
    request,
  }) => {
    const response = await request.get("/api/health");

    await expect(response).toBeOK();
    expect(response.headers()["cache-control"]).toContain("no-store");
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      service: "projectmatch",
    });
  });

  test("home page renders ProjectMatch landing and public entry points", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Find the right reviewed provider without opening a public bid.",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Submit project request" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Apply as provider" }).first(),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" }).first()).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Create account" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "A reviewed path from request to delivery" }),
    ).toBeVisible();
  });

  test("normal user login renders without authenticating", async ({ page }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("heading", { name: "Sign in" }),
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Create an account" }),
    ).toBeVisible();
  });

  test("registration page renders normal account options", async ({ page }) => {
    await page.goto("/register");

    await expect(
      page.getByRole("heading", { name: "Create account" }),
    ).toBeVisible();
    await expect(page.getByLabel("Full name")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Account type")).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Confirm password")).toBeVisible();
    await expect(
      page.locator('select[name="accountRole"] option'),
    ).toHaveText(["Requester", "Provider", "Requester and provider"]);
    await expect(page.getByText("admin")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  });

  test("app dashboard redirects unauthenticated users to login", async ({
    page,
  }) => {
    await page.goto("/app");

    await expect(page).toHaveURL(/\/login$/);
  });

  test("workspace data routes redirect unauthenticated users to login", async ({
    page,
  }) => {
    for (const path of [
      "/app/requests?page=0",
      "/app/provider?page=abc",
      "/app/engagements?page=-1",
      "/app/messages",
    ]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
    }
  });

  test("admin login redirects unauthenticated users to canonical login", async ({
    page,
  }) => {
    await page.goto("/admin/login");

    await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Frequests$/);
    await expect(
      page.getByRole("heading", { name: "Sign in" }),
    ).toBeVisible();
  });

  test("admin dashboard redirects unauthenticated users to canonical login", async ({
    page,
  }) => {
    await page.goto("/admin");

    await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Frequests$/);
    await expect(
      page.getByRole("heading", { name: "Sign in" }),
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

  test("admin login no longer renders a second credential form", async ({
    page,
  }) => {
    await page.goto("/admin/login");

    await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Frequests$/);
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await expect(page.locator("form")).toHaveCount(1);
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
