import Link from "next/link";
import { redirect } from "next/navigation";
import { getRegisterRedirectForRole } from "@/lib/auth/registration";
import { getOptionalUser } from "@/lib/auth/user";
import { registerUser } from "./actions";

type RegisterPageProps = {
  searchParams: Promise<{
    check_email?: string;
    error?: string;
  }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const { user } = await getOptionalUser();

  if (user) {
    redirect(getRegisterRedirectForRole(user.profile.role));
  }

  return (
    <main className="page-shell grid min-h-screen content-center py-10">
      <section className="mx-auto w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <Link className="text-sm font-bold text-blue-700" href="/">
          Back to ProjectMatch
        </Link>

        <div className="mt-8">
          <p className="text-sm font-bold uppercase text-blue-700">
            ProjectMatch
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-slate-950">
            Create account
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Join the controlled workspace as a requester, provider, or both.
          </p>
        </div>

        {params.check_email === "1" ? (
          <div className="notice-success mt-6">
            Check your email to finish creating your account.
          </div>
        ) : null}

        {params.error ? (
          <div className="notice-error mt-6">{params.error}</div>
        ) : null}

        <form action={registerUser} className="mt-6 grid gap-5">
          <label className="form-field">
            <span className="form-label">Full name</span>
            <input
              autoComplete="name"
              className="form-input"
              maxLength={120}
              name="fullName"
              required
              type="text"
            />
          </label>

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
            <span className="form-label">Account type</span>
            <select className="form-input" defaultValue="student" name="accountRole">
              <option value="student">Requester</option>
              <option value="freelancer">Provider</option>
              <option value="both">Requester and provider</option>
            </select>
          </label>

          <label className="form-field">
            <span className="form-label">Password</span>
            <input
              autoComplete="new-password"
              className="form-input"
              minLength={12}
              name="password"
              required
              type="password"
            />
          </label>

          <label className="form-field">
            <span className="form-label">Confirm password</span>
            <input
              autoComplete="new-password"
              className="form-input"
              minLength={12}
              name="confirmPassword"
              required
              type="password"
            />
          </label>

          <button className="button-primary" type="submit">
            Create account
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link className="font-bold text-blue-700" href="/login">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
