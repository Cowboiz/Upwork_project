import "server-only";

import type { EmailMessage } from "./client";

type ProjectRequestTemplateInput = {
  requesterName: string;
};

type ProviderApplicationTemplateInput = {
  applicantName: string;
};

type ProviderContactedTemplateInput = {
  budgetRange: string;
  budgetCurrency: string;
  deadline: string | null;
  deadlineFlexible: boolean;
  projectCategory: string;
  proposedCurrency: string;
  proposedPrice: number | null;
  providerName: string;
  responseUrl: string;
  scopeSummary: string | null;
};

type EngagementCreatedProviderTemplateInput = {
  agreedAmount: number;
  agreedCurrency: string;
  agreedDeadline: string | null;
  engagementUrl: string;
  projectCategory: string;
  providerName: string;
  scopeSummary: string | null;
};

type ShortlistPresentedTemplateInput = {
  availability: string;
  candidateRank: number;
  decisionUrl: string;
  proposedPrice: number | null;
  providerName: string;
  rateExpectations: string;
  scopeSummary: string | null;
  skills: string[];
  currency: string;
};

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

function formatList(values: string[]) {
  return values.length > 0 ? values.join(", ") : "Not provided";
}

function formatPrice(value: number | null, currency: string) {
  return value === null ? "Not set" : `${value} ${currency}`;
}

function formatDeadline(value: string | null, flexible: boolean) {
  if (value) {
    return flexible ? `${value} (flexible)` : value;
  }

  return flexible ? "Flexible" : "Not set";
}

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

export function providerContactedEmail({
  budgetRange,
  budgetCurrency,
  deadline,
  deadlineFlexible,
  projectCategory,
  proposedCurrency,
  proposedPrice,
  providerName,
  responseUrl,
  scopeSummary,
}: ProviderContactedTemplateInput): Omit<EmailMessage, "to"> {
  return {
    subject: "ProjectMatch opportunity marked for outreach",
    text: [
      `Hi ${providerName},`,
      "",
      "A reviewed ProjectMatch opportunity has been marked for provider outreach.",
      "",
      `Project category: ${formatStatus(projectCategory)}`,
      `Budget range: ${formatStatus(budgetRange)} ${budgetCurrency}`,
      `Deadline: ${formatDeadline(deadline, deadlineFlexible)}`,
      `Proposed price: ${formatPrice(proposedPrice, proposedCurrency)}`,
      scopeSummary ? `Scope summary: ${scopeSummary}` : null,
      "",
      "Review request and respond:",
      responseUrl,
      "",
      "Thanks,",
      "ProjectMatch",
    ]
      .filter((line): line is string => line !== null)
      .join("\n"),
  };
}

export function engagementCreatedProviderEmail({
  agreedAmount,
  agreedCurrency,
  agreedDeadline,
  engagementUrl,
  projectCategory,
  providerName,
  scopeSummary,
}: EngagementCreatedProviderTemplateInput): Omit<EmailMessage, "to"> {
  return {
    subject: "Your ProjectMatch engagement is ready",
    text: [
      `Hi ${providerName},`,
      "",
      "A ProjectMatch engagement is ready for provider delivery.",
      "",
      `Project category: ${formatStatus(projectCategory)}`,
      `Agreed amount: ${formatPrice(agreedAmount, agreedCurrency)}`,
      `Agreed deadline: ${agreedDeadline ?? "Not set"}`,
      scopeSummary ? `Scope summary: ${scopeSummary}` : null,
      "",
      "Open your engagement to start work:",
      engagementUrl,
      "",
      "Thanks,",
      "ProjectMatch",
    ]
      .filter((line): line is string => line !== null)
      .join("\n"),
  };
}

export function shortlistPresentedEmail({
  availability,
  candidateRank,
  currency,
  decisionUrl,
  proposedPrice,
  providerName,
  rateExpectations,
  scopeSummary,
  skills,
}: ShortlistPresentedTemplateInput): Omit<EmailMessage, "to"> {
  return {
    subject: "A provider match is ready for review",
    text: [
      "A provider match is ready for review.",
      "",
      `Provider: ${providerName}`,
      `Rank: ${candidateRank}`,
      `Skills: ${formatList(skills)}`,
      `Availability: ${availability}`,
      `Rate expectations: ${rateExpectations}`,
      `Proposed price: ${formatPrice(proposedPrice, currency)}`,
      scopeSummary ? `Scope summary: ${scopeSummary}` : null,
      "",
      "Review this match and respond:",
      decisionUrl,
      "",
      "Thanks,",
      "ProjectMatch",
    ]
      .filter((line): line is string => line !== null)
      .join("\n"),
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
