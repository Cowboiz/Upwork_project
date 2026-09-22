import "server-only";

import { Resend } from "resend";

export type EmailMessage = {
  idempotencyKey?: string;
  subject: string;
  text: string;
  to: string;
};

function optionalEnv(name: string) {
  const value = process.env[name]?.trim();

  return value && value.length > 0 ? value : null;
}

function requireEnv(name: string) {
  const value = optionalEnv(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getAdminNotificationEmail() {
  return optionalEnv("ADMIN_NOTIFICATION_EMAIL");
}

export function isEmailEnabled() {
  return optionalEnv("EMAIL_ENABLED")?.toLowerCase() === "true";
}

export function resolveDeliveryRecipient(recipient: string) {
  return optionalEnv("EMAIL_DEV_OVERRIDE_TO") ?? recipient;
}

export async function sendEmail(message: EmailMessage) {
  if (!isEmailEnabled()) {
    return { skipped: "disabled" as const };
  }

  const resend = new Resend(requireEnv("RESEND_API_KEY"));
  const replyTo = optionalEnv("EMAIL_REPLY_TO");

  const result = await resend.emails.send(
    {
      from: requireEnv("EMAIL_FROM"),
      replyTo: replyTo ?? undefined,
      subject: message.subject,
      text: message.text,
      to: message.to,
    },
    { idempotencyKey: message.idempotencyKey },
  );

  if (result.error) {
    throw new Error(result.error.message);
  }

  return { providerMessageId: result.data.id, skipped: null };
}
