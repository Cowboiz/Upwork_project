import { z } from "zod";

export const profileUpdateSchema = z.object({
  fullName: z.string().trim().max(120, "Full name is too long.").optional(),
  username: z
    .string()
    .trim()
    .max(40, "Username is too long.")
    .optional()
    .refine(
      (value) =>
        !value ||
        value.length === 0 ||
        (value.length >= 3 && /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(value)),
      "Use 3-40 letters, numbers, dots, dashes, or underscores.",
    ),
});

export function parseProfileUpdateInput(input: Record<string, unknown>) {
  return profileUpdateSchema.safeParse(input);
}
