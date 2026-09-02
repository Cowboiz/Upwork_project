export const contactMethods = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "discord", label: "Discord" },
  { value: "telegram", label: "Telegram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "other", label: "Other" },
] as const;

export const projectCategories = [
  { value: "web_landing_page", label: "Web or landing page" },
  { value: "ui_ux_prototype", label: "UI/UX or prototype" },
  { value: "graphic_brand_design", label: "Graphic or brand design" },
  { value: "small_web_development", label: "Small web development" },
  { value: "integration_automation", label: "Integration or automation" },
  { value: "other", label: "Other legitimate project" },
] as const;

export const budgetRanges = [
  { value: "lt_50", label: "Under 50" },
  { value: "50_100", label: "50-100" },
  { value: "100_300", label: "100-300" },
  { value: "300_500", label: "300-500" },
  { value: "500_plus", label: "500+" },
  { value: "unknown", label: "Not sure yet" },
] as const;

export const providerSkills = [
  "UI/UX",
  "Figma",
  "Graphic design",
  "HTML/CSS",
  "JavaScript/TypeScript",
  "React/Next.js",
  "Back-end",
  "Automation/integration",
] as const;
