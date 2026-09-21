import "server-only";

import type { EmailMessage } from "./client";

type ProjectRequestTemplateInput = {
  requesterName: string;
};

type ProviderApplicationTemplateInput = {
  applicantName: string;
};

export function requesterRequestSubmittedEmail({
  requesterName,
}: ProjectRequestTemplateInput): Omit<EmailMessage, "to"> {
  return {
    subject: "We received your ProjectMatch request",
    text: [
      `Hi ${requesterName},`,
      "",
      "We received your ProjectMatch request. An operator will review it and follow up with the next step if it is a fit.",
      "",
      "Thanks,",
      "ProjectMatch",
    ].join("\n"),
  };
}

export function adminNewRequestEmail(): Omit<EmailMessage, "to"> {
  return {
    subject: "New ProjectMatch request submitted",
    text: [
      "A new ProjectMatch request was submitted.",
      "",
      "Review it in the admin request queue.",
    ].join("\n"),
  };
}

export function providerApplicationSubmittedEmail({
  applicantName,
}: ProviderApplicationTemplateInput): Omit<EmailMessage, "to"> {
  return {
    subject: "We received your ProjectMatch provider application",
    text: [
      `Hi ${applicantName},`,
      "",
      "We received your ProjectMatch provider application. An operator will review it and follow up if there is a fit.",
      "",
      "Thanks,",
      "ProjectMatch",
    ].join("\n"),
  };
}

export function adminNewProviderApplicationEmail(): Omit<EmailMessage, "to"> {
  return {
    subject: "New ProjectMatch provider application submitted",
    text: [
      "A new ProjectMatch provider application was submitted.",
      "",
      "Review it in the admin provider queue.",
    ].join("\n"),
  };
}
