import { z } from "zod";
import { budgetRanges, contactMethods, projectCategories } from "./options";

const contactMethodValues = contactMethods.map((method) => method.value);
const projectCategoryValues = projectCategories.map((category) => category.value);
const budgetRangeValues = budgetRanges.map((range) => range.value);

const requiredText = z.string().trim().min(1, "This field is required.");

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null));

const checkboxBoolean = z
  .union([z.literal("on"), z.literal("true"), z.literal("yes")])
  .transform(() => true);

const currencyCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Use a three-letter currency code.");

const optionalDate = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))
  .refine((value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: "Use a valid date.",
  });

const linksList = z
  .string()
  .trim()
  .transform((value) =>
    value
      .split(/\r?\n|,/)
      .map((link) => link.trim())
      .filter(Boolean),
  );

export const projectRequestSchema = z.object({
  requester_name: requiredText.max(120),
  contact_method: z.enum(contactMethodValues),
  contact_value: requiredText.max(200),
  school_or_context: optionalText,
  category: z.enum(projectCategoryValues),
  description: requiredText.min(30).max(5000),
  desired_deliverables: optionalText,
  deadline: optionalDate,
  deadline_flexible: z
    .union([checkboxBoolean, z.undefined()])
    .transform((value) => value === true),
  budget_range: z.enum(budgetRangeValues),
  currency: currencyCode,
  asset_links: linksList,
  source_channel: optionalText,
  contact_permission_confirmed: checkboxBoolean,
  age_eligible_confirmed: checkboxBoolean,
  integrity_attested: checkboxBoolean,
});

export const providerApplicationSchema = z.object({
  applicant_name: requiredText.max(120),
  contact_method: z.enum(contactMethodValues),
  contact_value: requiredText.max(200),
  skills: linksList,
  preferred_project_types: linksList,
  portfolio_urls: linksList.pipe(
    z.array(z.string().url("Enter valid portfolio URLs.")).min(1),
  ),
  availability: requiredText.max(500),
  rate_expectations: requiredText.max(500),
  source_channel: optionalText,
  age_eligible_confirmed: checkboxBoolean,
  privacy_acknowledged_at: checkboxBoolean.transform(() =>
    new Date().toISOString(),
  ),
  policy_accepted_at: checkboxBoolean.transform(() => new Date().toISOString()),
});

export type ProjectRequestInput = z.infer<typeof projectRequestSchema>;
export type ProviderApplicationInput = z.infer<typeof providerApplicationSchema>;

export function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}
