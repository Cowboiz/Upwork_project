import Link from "next/link";
import { redirect } from "next/navigation";
import {
  canUseAuthenticatedLogin,
  getPostLoginRedirect,
  toAuthenticatedProfile,
} from "@/lib/auth/user-shared";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loginUser } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    account_disabled?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!claimsError && userId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, account_status, full_name, role, username")
      .eq("id", userId)
      .single();

    if (profile) {
      const authenticatedProfile = toAuthenticatedProfile(profile);

      if (!canUseAuthenticatedLogin(authenticatedProfile)) {
        await supabase.auth.signOut();
      } else {
        redirect(
          getPostLoginRedirect(params.next, authenticatedProfile.role),
        );
      }
    }
  }

  return (
    <main className="page-shell grid min-h-screen content-center py-10">
      <section className="mx-auto w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <Link className="text-sm font-bold text-blue-700" href="/">
          Back to ProjectMatch
        </Link>

        <div className="mt-8">
          <p className="text-sm font-bold uppercase text-blue-700">
            ProjectMatch
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-slate-950">
            Sign in
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Access your dashboard, saved requests, and future workspace tools.
          </p>
        </div>

        {params.error ? (
          <div className="notice-error mt-6">{params.error}</div>
        ) : null}

        {params.account_disabled === "1" ? (
          <div className="notice-error mt-6">
            This account is currently disabled. Contact the operator if you need
            access restored.
          </div>
        ) : null}

        <form action={loginUser} className="mt-6 grid gap-5">
          <input name="redirectTo" type="hidden" value={params.next ?? ""} />

          <label className="form-field">
            <span className="form-label">Email</span>
            <input
              autoComplete="email"
              className="form-input"
              name="email"
              required
              type="email"
            />
          </label>

          <label className="form-field">
            <span className="form-label">Password</span>
            <input
              autoComplete="current-password"
              className="form-input"
              name="password"
              required
              type="password"
            />
          </label>

          <button className="button-primary" type="submit">
            Sign in
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          New to ProjectMatch?{" "}
          <Link className="font-bold text-blue-700" href="/register">
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}
