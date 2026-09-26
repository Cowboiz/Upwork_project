import { describe, expect, it } from "vitest";
import {
  budgetRanges,
  contactMethods,
  projectCategories,
} from "./options";
import {
  projectRequestSchema,
  providerApplicationSchema,
} from "./validation";

const emailContactMethod = contactMethods.find(
  (method) => method.value === "email",
)!.value;
const phoneContactMethod = contactMethods.find(
  (method) => method.value === "phone",
)!.value;
const projectCategory = projectCategories[0].value;
const budgetRange = budgetRanges[1].value;

function validProjectRequestFixture() {
  return {
    age_eligible_confirmed: "on",
    asset_links: "https://example.com/brief",
    budget_range: budgetRange,
    category: projectCategory,
    contact_method: emailContactMethod,
    contact_permission_confirmed: "on",
    contact_value: "student@example.com",
    currency: "USD",
    deadline: "2026-10-30",
    deadline_flexible: "on",
    description:
      "I need a polished landing page for a student project marketplace pilot.",
    desired_deliverables: "Landing page copy and responsive implementation",
    integrity_attested: "on",
    intake_submission_id: "11111111-1111-4111-8111-111111111111",
    requester_name: "Student Founder",
    school_or_context: "Campus startup group",
    source_channel: "Referral",
  };
}

function validProviderApplicationFixture() {
  return {
    age_eligible_confirmed: "on",
    applicant_name: "Provider One",
    availability: "Weeknights and weekends",
    contact_method: emailContactMethod,
    contact_value: "provider@example.com",
    intake_submission_id: "22222222-2222-4222-8222-222222222222",
    policy_confirmed: "on",
    portfolio_urls: "https://example.com/portfolio",
    preferred_project_types: "Landing pages\nReact apps",
    privacy_confirmed: "on",
    rate_expectations: "$25/hour or fixed scope",
    skills: "React\nTypeScript",
    source_channel: "Campus group",
  };
}

describe("projectRequestSchema", () => {
  it("parses a valid project request", () => {
    const result = projectRequestSchema.safeParse(validProjectRequestFixture());

    expect(result.success).toBe(true);
  });

  it("normalizes currency to uppercase", () => {
    const result = projectRequestSchema.safeParse({
      ...validProjectRequestFixture(),
      currency: "usd",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe("USD");
    }
  });

  it("normalizes blank optional text fields to null", () => {
    const result = projectRequestSchema.safeParse({
      ...validProjectRequestFixture(),
      deadline: "",
      desired_deliverables: "   ",
      school_or_context: "",
      source_channel: " ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.deadline).toBeNull();
      expect(result.data.desired_deliverables).toBeNull();
      expect(result.data.school_or_context).toBeNull();
      expect(result.data.source_channel).toBeNull();
    }
  });

  it("parses newline and comma separated asset links", () => {
    const result = projectRequestSchema.safeParse({
      ...validProjectRequestFixture(),
      asset_links: " https://a.example/one \n https://b.example/two, https://c.example/three ,,",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.asset_links).toEqual([
        "https://a.example/one",
        "https://b.example/two",
        "https://c.example/three",
      ]);
    }
  });

  it("rejects invalid email contact values", () => {
    const result = projectRequestSchema.safeParse({
      ...validProjectRequestFixture(),
      contact_value: "not-an-email",
    });

    expect(result.success).toBe(false);
  });

  it("rejects missing required confirmations", () => {
    const fixture = validProjectRequestFixture();
    const input: Partial<ReturnType<typeof validProjectRequestFixture>> = {
      ...fixture,
    };
    delete input.contact_permission_confirmed;

    const result = projectRequestSchema.safeParse(input);

    expect(result.success).toBe(false);
  });

  it("rejects descriptions shorter than the current minimum", () => {
    const result = projectRequestSchema.safeParse({
      ...validProjectRequestFixture(),
      description: "Too short.",
    });

    expect(result.success).toBe(false);
  });
});

describe("providerApplicationSchema", () => {
  it("parses a valid provider application", () => {
    const result = providerApplicationSchema.safeParse(
      validProviderApplicationFixture(),
    );

    expect(result.success).toBe(true);
  });

  it("deduplicates skills case-insensitively while preserving the first occurrence", () => {
    const result = providerApplicationSchema.safeParse({
      ...validProviderApplicationFixture(),
      skills: "React\nreact\nTypeScript",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.skills).toEqual(["React", "TypeScript"]);
    }
  });

  it("rejects invalid phone contact values", () => {
    const result = providerApplicationSchema.safeParse({
      ...validProviderApplicationFixture(),
      contact_method: phoneContactMethod,
      contact_value: "123",
    });

    expect(result.success).toBe(false);
  });

  it("rejects non-http portfolio URLs", () => {
    const result = providerApplicationSchema.safeParse({
      ...validProviderApplicationFixture(),
      portfolio_urls: "ftp://example.com/portfolio",
    });

    expect(result.success).toBe(false);
  });

  it("rejects more than 10 portfolio URLs", () => {
    const result = providerApplicationSchema.safeParse({
      ...validProviderApplicationFixture(),
      portfolio_urls: Array.from(
        { length: 11 },
        (_, index) => `https://example.com/${index}`,
      ).join("\n"),
    });

    expect(result.success).toBe(false);
  });

  it("strips unknown object fields", () => {
    const result = providerApplicationSchema.safeParse({
      ...validProviderApplicationFixture(),
      unexpected_field: "should not survive",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(
        "unexpected_field" in (result.data as Record<string, unknown>),
      ).toBe(false);
    }
  });
});
