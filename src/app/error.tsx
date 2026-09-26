"use client";

type ErrorBoundaryProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorBoundary({ reset }: ErrorBoundaryProps) {
  return (
    <main className="page-shell grid min-h-screen content-center py-10">
      <section className="mx-auto max-w-xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.12em] text-blue-700">
          ProjectMatch
        </p>
        <h1 className="mt-3 text-3xl font-bold text-slate-950">
          Something went wrong
        </h1>
        <p className="mt-4 text-slate-700">
          We couldn&apos;t load this page. Please try again.
        </p>
        <button className="button-primary mt-6" type="button" onClick={reset}>
          Try again
        </button>
      </section>
    </main>
  );
}
