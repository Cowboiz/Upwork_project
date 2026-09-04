import Link from "next/link";
import { loginAdmin } from "./actions";

type AdminLoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function AdminLoginPage({
  searchParams,
}: AdminLoginPageProps) {
  const params = await searchParams;

  return (
    <main className="page-shell grid min-h-screen content-center py-10">
      <section className="mx-auto w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <Link className="text-sm font-bold text-blue-700" href="/">
          Back to ProjectMatch
        </Link>

        <div className="mt-8">
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-blue-700">
            Admin
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-slate-950">
            Sign in
          </h1>
        </div>

        {params.error ? (
          <div className="notice-error mt-6">{params.error}</div>
        ) : null}

        <form action={loginAdmin} className="mt-6 grid gap-5">
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
      </section>
    </main>
  );
}
