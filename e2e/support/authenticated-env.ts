type RequiredAuthenticatedEnvName =
  | "E2E_STUDENT_EMAIL"
  | "E2E_STUDENT_PASSWORD"
  | "E2E_PROVIDER_EMAIL"
  | "E2E_PROVIDER_PASSWORD"
  | "E2E_ADMIN_EMAIL"
  | "E2E_ADMIN_PASSWORD"
  | "E2E_SUPABASE_SECRET_KEY";

const expectedDevHostname = "vuvsrpzbdrnvsctgxebb.supabase.co";

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

export function assertProjectMatchDevSupabaseUrl(value: string, name: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL.`);
  }

  if (url.hostname !== expectedDevHostname) {
    throw new Error(
      `${name} must target ProjectMatch DEV (${expectedDevHostname}); received ${url.hostname}.`,
    );
  }

  return url;
}

function readSupabaseUrl() {
  const e2eValue = process.env.E2E_SUPABASE_URL;
  const publicValue = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const value = e2eValue ?? publicValue;

  if (!value) {
    throw new Error(
      "Authenticated E2E requires E2E_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL.",
    );
  }

  const parsed = assertProjectMatchDevSupabaseUrl(
    value,
    e2eValue ? "E2E_SUPABASE_URL" : "NEXT_PUBLIC_SUPABASE_URL",
  );

  if (e2eValue && publicValue) {
    const publicParsed = assertProjectMatchDevSupabaseUrl(
      publicValue,
      "NEXT_PUBLIC_SUPABASE_URL",
    );

    if (parsed.hostname !== publicParsed.hostname) {
      throw new Error(
        "E2E_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_URL must target the same ProjectMatch DEV project.",
      );
    }
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
  const adminEmail = readRequired("E2E_ADMIN_EMAIL");
  const providerEmail = readRequired("E2E_PROVIDER_EMAIL");
  const studentEmail = readRequired("E2E_STUDENT_EMAIL");
  const distinctEmails = new Set(
    [adminEmail, providerEmail, studentEmail].map((email) =>
      email.trim().toLowerCase(),
    ),
  );

  if (distinctEmails.size !== 3) {
    throw new Error(
      "Authenticated E2E admin, provider, and student emails must be distinct dedicated identities.",
    );
  }

  return {
    adminEmail,
    adminPassword: readRequired("E2E_ADMIN_PASSWORD"),
    providerEmail,
    providerPassword: readRequired("E2E_PROVIDER_PASSWORD"),
    studentEmail,
    studentPassword: readRequired("E2E_STUDENT_PASSWORD"),
    supabasePublishableKey: readSupabasePublishableKey(),
    supabaseSecretKey: readRequired("E2E_SUPABASE_SECRET_KEY"),
    supabaseUrl: readSupabaseUrl(),
  };
}
