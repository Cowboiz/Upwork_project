import Link from "next/link";

const processSteps = [
  "Submit a clear project request",
  "A real operator reviews fit and policy",
  "You receive a curated next step",
];

export default function HomePage() {
  return (
    <main>
      <section className="page-shell grid min-h-screen content-center gap-12 py-10 md:grid-cols-[1.1fr_0.9fr] md:items-center">
        <div className="max-w-2xl">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-blue-700">
            Manual matching for student projects
          </p>
          <h1 className="text-4xl font-bold leading-tight text-slate-950 md:text-6xl">
            ProjectMatch
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-700">
            Find a reviewed designer or developer for a legitimate website,
            prototype, design, automation, club, startup, portfolio, or
            hackathon project.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link className="button-primary" href="/request">
              Submit project request
            </Link>
            <Link className="button-secondary" href="/provider/apply">
              Apply as provider
            </Link>
          </div>
          <p className="mt-5 text-sm leading-6 text-slate-600">
            Requests are private, reviewed manually, and screened for academic
            integrity before matching.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">What happens next</h2>
          <ol className="mt-5 grid gap-4">
            {processSteps.map((step, index) => (
              <li className="flex gap-4" key={step}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">
                  {index + 1}
                </span>
                <span className="pt-1 text-slate-700">{step}</span>
              </li>
            ))}
          </ol>
          <div className="mt-6 rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            The first response target is under 12 hours during active operation.
            Shortlists are curated manually rather than opened for bidding.
          </div>
        </div>
      </section>
    </main>
  );
}
