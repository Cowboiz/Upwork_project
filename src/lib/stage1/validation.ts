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

const optionalTextMax = (maxLength: number, message: string) =>
  z
    .string()
    .trim()
    .max(maxLength, message)
    .transform((value) => (value.length > 0 ? value : null));

const checkboxBoolean = z
  .union(
    [z.literal("on"), z.literal("true"), z.literal("yes")],
    "Please confirm this before submitting.",
  )
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

const requiredList = (message: string) =>
  linksList.refine((items) => items.length > 0, { message });

const normalizedTextList = ({
  requiredMessage,
  maxItems,
  maxItemsMessage,
  minItemLength,
  minItemMessage,
  maxItemLength,
  maxItemMessage,
  dedupeCaseInsensitive = false,
}: {
  requiredMessage: string;
  maxItems: number;
  maxItemsMessage: string;
  minItemLength: number;
  minItemMessage: (index: number) => string;
  maxItemLength: number;
  maxItemMessage: (index: number) => string;
  dedupeCaseInsensitive?: boolean;
}) =>
  linksList
    .transform((items) => {
      if (!dedupeCaseInsensitive) {
        return items;
      }

      const seen = new Set<string>();
      return items.filter((item) => {
        const key = item.toLocaleLowerCase();

        if (seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      });
    })
    .superRefine((items, context) => {
      if (items.length < 1) {
        context.addIssue({
          code: "custom",
          message: requiredMessage,
        });
      }

      if (items.length > maxItems) {
        context.addIssue({
          code: "custom",
          message: maxItemsMessage,
        });
      }

      items.forEach((item, index) => {
        if (item.length < minItemLength) {
          context.addIssue({
            code: "custom",
            message: minItemMessage(index),
          });
        }

        if (item.length > maxItemLength) {
          context.addIssue({
            code: "custom",
            message: maxItemMessage(index),
          });
        }
      });
    });

const portfolioUrls = requiredList(
  "Add at least one portfolio URL before submitting.",
).superRefine((urls, context) => {
  if (urls.length > 10) {
    context.addIssue({
      code: "custom",
      message: "Add no more than 10 portfolio URLs.",
    });
  }

  urls.forEach((url, index) => {
    let parsedUrl: URL | null = null;

    try {
      parsedUrl = new URL(url);
    } catch {
      parsedUrl = null;
    }

    if (
      parsedUrl === null ||
      !["http:", "https:"].includes(parsedUrl.protocol)
    ) {
      context.addIssue({
        code: "custom",
        message: `Portfolio URL ${index + 1} must be a valid http or https URL.`,
      });
    }
  });
});

const emailAddress = z.email("Enter a valid email address.");

const hasReasonablePhoneShape = (value: string) => {
  const digits = value.replace(/\D/g, "");

  return (
    digits.length >= 7 &&
    digits.length <= 15 &&
    /^\+?[0-9][0-9\s().-]*[0-9]$/.test(value)
  );
};

const providerApplicationBaseSchema = z.object({
  applicant_name: requiredText
    .min(2, "Enter a name or display name with at least 2 characters.")
    .max(80, "Use 80 characters or fewer for your name or display name."),
  contact_method: z.enum(contactMethodValues, "Choose a contact method."),
  contact_value: requiredText
    .min(2, "Enter a meaningful contact detail.")
    .max(200, "Use 200 characters or fewer for your contact detail."),
  skills: normalizedTextList({
    requiredMessage: "Add at least one skill.",
    maxItems: 15,
    maxItemsMessage: "Add no more than 15 skills.",
    minItemLength: 2,
    minItemMessage: (index) =>
      `Skill ${index + 1} must be at least 2 characters.`,
    maxItemLength: 50,
    maxItemMessage: (index) => `Skill ${index + 1} must be 50 characters or fewer.`,
    dedupeCaseInsensitive: true,
  }),
  preferred_project_types: normalizedTextList({
    requiredMessage: "Add at least one preferred project type.",
    maxItems: 10,
    maxItemsMessage: "Add no more than 10 preferred project types.",
    minItemLength: 3,
    minItemMessage: (index) =>
      `Preferred project type ${index + 1} must be at least 3 characters.`,
    maxItemLength: 100,
    maxItemMessage: (index) =>
      `Preferred project type ${index + 1} must be 100 characters or fewer.`,
  }),
  portfolio_urls: portfolioUrls,
  availability: requiredText
    .min(3, "Enter availability with at least 3 characters.")
    .max(200, "Use 200 characters or fewer for availability."),
  rate_expectations: requiredText
    .min(2, "Enter rate expectations with at least 2 characters.")
    .max(200, "Use 200 characters or fewer for rate expectations."),
  source_channel: optionalTextMax(
    100,
    "Use 100 characters or fewer for the source or referrer.",
  ),
  age_eligible_confirmed: checkboxBoolean,
  privacy_confirmed: checkboxBoolean,
  policy_confirmed: checkboxBoolean,
});

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

export const providerApplicationSchema = providerApplicationBaseSchema
  .strip()
  .superRefine((input, context) => {
    if (
      input.contact_method === "email" &&
      !emailAddress.safeParse(input.contact_value).success
    ) {
      context.addIssue({
        code: "custom",
        path: ["contact_value"],
        message: "Enter a valid email address.",
      });
    }

    if (
      ["phone", "whatsapp"].includes(input.contact_method) &&
      !hasReasonablePhoneShape(input.contact_value)
    ) {
      context.addIssue({
        code: "custom",
        path: ["contact_value"],
        message: "Enter a phone number with 7 to 15 digits.",
      });
    }
  });

export type ProjectRequestInput = z.infer<typeof projectRequestSchema>;
export type ProviderApplicationInput = z.infer<typeof providerApplicationSchema>;

export function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}
