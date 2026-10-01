import Link from "next/link";
import { PublicHeader } from "./public-header";

const requesterCategories = [
  "Landing pages",
  "UI/UX prototypes",
  "Graphic / brand design",
  "Small web development",
  "Integration / automation",
  "Other legitimate digital projects",
];

const processSteps = [
  {
    title: "Submit a clear request",
    body: "Describe the project, goals, deadline, and budget range so an operator can review fit.",
  },
  {
    title: "Operator review",
    body: "Requests are checked for scope, policy fit, and academic integrity before matching.",
  },
  {
    title: "Curated provider match",
    body: "A reviewed provider is contacted for the specific opportunity rather than placed into open bidding.",
  },
  {
    title: "Engagement and delivery",
    body: "Accepted matches move into an engagement workflow for start, delivery, completion, and feedback.",
  },
];

const providerSteps = [
  "Apply with skills, availability, and portfolio context",
  "Operator review confirms fit for the curated network",
  "Receive matched opportunities and accept or decline",
  "Deliver through the engagement workflow when matched",
];

export default function HomePage() {
  return (
    <>
      <PublicHeader />
      <main>
        <section className="bg-white">
          <div className="page-shell grid min-h-[calc(100vh-80px)] gap-10 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-16">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase text-blue-700">
                Manual matching for legitimate digital projects
              </p>
              <h1 className="mt-4 text-4xl font-bold leading-tight text-slate-950 md:text-6xl">
                Find the right reviewed provider without opening a public bid.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">
                ProjectMatch helps students, clubs, founders, and early teams
                submit legitimate digital project requests for operator review
                and curated provider matching.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link className="button-primary" href="/request">
                  Submit project request
                </Link>
                <Link className="button-secondary" href="/provider/apply">
                  Apply as provider
                </Link>
                <Link className="button-secondary" href="/register">
                  Create account
                </Link>
                <Link className="button-secondary" href="/login">
                  Sign in
                </Link>
              </div>
              <p className="mt-5 text-sm leading-6 text-slate-600">
                Requests must be for legitimate support work. ProjectMatch does
                not position providers as a way to outsource academic work.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 shadow-sm">
              <div className="rounded-lg bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <div className="text-sm font-bold text-slate-950">
                      Curated match workflow
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Request review - provider response - engagement
                    </div>
                  </div>
                  <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                    Reviewed
                  </span>
                </div>
                <div className="mt-5 grid gap-3">
                  {processSteps.slice(0, 3).map((step, index) => (
                    <div
                      className="flex gap-3 rounded-lg border border-slate-200 bg-white p-3"
                      key={step.title}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">
                        {index + 1}
                      </span>
                      <div>
                        <div className="text-sm font-bold text-slate-950">
                          {step.title}
                        </div>
                        <p className="mt-1 text-sm leading-5 text-slate-600">
                          {step.body}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          className="border-y border-slate-200 bg-slate-50 py-14"
          id="how-it-works"
        >
          <div className="page-shell">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase text-blue-700">
                How it works
              </p>
              <h2 className="mt-3 text-3xl font-bold text-slate-950">
                A reviewed path from request to delivery
              </h2>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {processSteps.map((step, index) => (
                <article
                  className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                  key={step.title}
                >
                  <div className="text-sm font-bold text-blue-700">
                    Step {index + 1}
                  </div>
                  <h3 className="mt-3 text-xl font-bold text-slate-950">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-700">
                    {step.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-14" id="requesters">
          <div className="page-shell grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-sm font-bold uppercase text-blue-700">
                For students and requesters
              </p>
              <h2 className="mt-3 text-3xl font-bold text-slate-950">
                Bring a legitimate digital project to a reviewed operator queue.
              </h2>
              <p className="mt-4 leading-7 text-slate-700">
                Use ProjectMatch for project support such as websites,
                prototypes, design, brand assets, and lightweight automation.
                The process is built for clear scopes and appropriate use.
              </p>
              <Link className="button-primary mt-6" href="/request">
                Submit project request
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {requesterCategories.map((category) => (
                <div
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-800"
                  key={category}
                >
                  {category}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          className="border-y border-slate-200 bg-slate-50 py-14"
          id="providers"
        >
          <div className="page-shell grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-start">
            <div>
              <p className="text-sm font-bold uppercase text-blue-700">
                For providers
              </p>
              <h2 className="mt-3 text-3xl font-bold text-slate-950">
                Join a curated matching workflow, not an open bidding feed.
              </h2>
              <p className="mt-4 leading-7 text-slate-700">
                Providers apply once, get reviewed, and can receive matched
                opportunities that fit their skills and availability. Each
                opportunity can be accepted or declined.
              </p>
              <Link className="button-secondary mt-6" href="/provider/apply">
                Apply as provider
              </Link>
            </div>

            <ol className="grid gap-3">
              {providerSteps.map((step, index) => (
                <li
                  className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4"
                  key={step}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">
                    {index + 1}
                  </span>
                  <span className="pt-1 text-sm font-bold leading-6 text-slate-800">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="bg-white py-14">
          <div className="page-shell">
            <div className="rounded-lg border border-slate-200 bg-slate-950 p-6 text-white md:p-8">
              <p className="text-sm font-bold uppercase text-blue-200">
                Trust and integrity
              </p>
              <h2 className="mt-3 max-w-3xl text-3xl font-bold">
                Built around manual review and legitimate-use screening.
              </h2>
              <div className="mt-6 grid gap-4 md:grid-cols-4">
                {[
                  "Requests are reviewed manually before matching.",
                  "Academic integrity screening is part of request review.",
                  "Request details stay in the operator workflow rather than a public bid board.",
                  "Matching is curated around fit instead of open bidding.",
                ].map((item) => (
                  <div
                    className="rounded-lg border border-slate-700 bg-slate-900 p-4 text-sm leading-6 text-slate-100"
                    key={item}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="page-shell flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-bold text-slate-950">ProjectMatch</div>
            <p className="mt-1 text-sm text-slate-600">
              Curated matching for legitimate digital projects.
            </p>
          </div>
          <nav className="flex flex-wrap gap-4 text-sm font-bold text-slate-700">
            <Link className="hover:text-blue-700" href="/request">
              Submit request
            </Link>
            <Link className="hover:text-blue-700" href="/provider/apply">
              Apply as provider
            </Link>
            <Link className="hover:text-blue-700" href="/login">
              Sign in
            </Link>
            <Link className="hover:text-blue-700" href="/register">
              Create account
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
