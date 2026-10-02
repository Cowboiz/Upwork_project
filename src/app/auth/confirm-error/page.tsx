import Link from "next/link";

export default function AuthConfirmationErrorPage() {
  return (
    <main className="page-shell grid min-h-screen content-center py-10">
      <section className="mx-auto w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <Link className="text-sm font-bold text-blue-700" href="/">
          Back to ProjectMatch
        </Link>

        <div className="mt-8">
          <p className="text-sm font-bold uppercase text-blue-700">
            Account confirmation
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-slate-950">
            Confirmation link unavailable
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            That confirmation link could not be used. It may have expired or
            already been opened.
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link className="button-primary text-center" href="/register?check_email=1">
            Resend confirmation
          </Link>
          <Link className="button-secondary text-center" href="/login">
            Sign in
          </Link>
        </div>
      </section>
    </main>
  );
}
