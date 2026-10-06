type RequiredAuthenticatedEnvName =
  | "E2E_STUDENT_EMAIL"
  | "E2E_STUDENT_PASSWORD"
  | "E2E_PROVIDER_EMAIL"
  | "E2E_PROVIDER_PASSWORD"
  | "E2E_ADMIN_EMAIL"
  | "E2E_ADMIN_PASSWORD"
  | "E2E_SUPABASE_SECRET_KEY";

export type AuthenticatedE2EEnv = {
  adminEmail: string;
  adminPassword: string;
  providerEmail: string;
  providerPassword: string;
  studentEmail: string;
  studentPassword: string;
  supabasePublishableKey: string;
  supabaseSecretKey: string;
  supabaseUrl: string;
};

function readRequired(name: RequiredAuthenticatedEnvName) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Authenticated E2E requires ${name}.`);
  }

  return value;
}

function readSupabaseUrl() {
  const value = process.env.E2E_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!value) {
    throw new Error(
      "Authenticated E2E requires E2E_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL.",
    );
  }

  return value;
}

function readSupabasePublishableKey() {
  const value =
    process.env.E2E_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!value) {
    throw new Error(
      "Authenticated E2E requires E2E_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  return value;
}

export function readAuthenticatedE2EEnv(): AuthenticatedE2EEnv {
  return {
    adminEmail: readRequired("E2E_ADMIN_EMAIL"),
    adminPassword: readRequired("E2E_ADMIN_PASSWORD"),
    providerEmail: readRequired("E2E_PROVIDER_EMAIL"),
    providerPassword: readRequired("E2E_PROVIDER_PASSWORD"),
    studentEmail: readRequired("E2E_STUDENT_EMAIL"),
    studentPassword: readRequired("E2E_STUDENT_PASSWORD"),
    supabasePublishableKey: readSupabasePublishableKey(),
    supabaseSecretKey: readRequired("E2E_SUPABASE_SECRET_KEY"),
    supabaseUrl: readSupabaseUrl(),
  };
}
