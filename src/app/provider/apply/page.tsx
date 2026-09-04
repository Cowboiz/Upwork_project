import Link from "next/link";
import { contactMethods, providerSkills } from "@/lib/stage1/options";
import { submitProviderApplication } from "./actions";

type ProviderApplyPageProps = {
  searchParams: Promise<{
    submitted?: string;
    error?: string;
  }>;
};

export default async function ProviderApplyPage({
  searchParams,
}: ProviderApplyPageProps) {
  const params = await searchParams;
  const submitted = params.submitted === "1";
  const error = params.error;

  return (
    <main className="page-shell py-8">
      <Link className="text-sm font-bold text-blue-700" href="/">
        Back to ProjectMatch
      </Link>

      <div className="mt-8 grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <section>
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-blue-700">
            Provider application
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-slate-950 md:text-5xl">
            Share the work you can take on.
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-700">
            Approved providers receive manually reviewed opportunities that fit
            their skills, availability, and project preferences.
          </p>
          <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-700">
            At least one portfolio URL is required for review. Private contact
            details are not listed publicly.
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-7">
          {submitted ? (
            <div className="notice-success mb-6">
              Application submitted. We will review your portfolio, availability,
              and project fit manually.
            </div>
          ) : null}

          {error ? <div className="notice-error mb-6">{error}</div> : null}

          <form action={submitProviderApplication} className="grid gap-5">
            <label className="form-field">
              <span className="form-label">Name or display name</span>
              <input className="form-input" name="applicant_name" required />
            </label>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="form-field">
                <span className="form-label">Contact method</span>
                <select className="form-input" name="contact_method" required>
                  {contactMethods.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span className="form-label">Contact detail</span>
                <input className="form-input" name="contact_value" required />
              </label>
            </div>

            <label className="form-field">
              <span className="form-label">Skills</span>
              <textarea
                className="form-input min-h-24"
                name="skills"
                placeholder={providerSkills.join(", ")}
                required
              />
              <p className="form-help">Use commas or one skill per line.</p>
            </label>

            <label className="form-field">
              <span className="form-label">Preferred project types</span>
              <textarea
                className="form-input min-h-24"
                name="preferred_project_types"
                placeholder="Landing pages, prototypes, small React builds"
                required
              />
            </label>

            <label className="form-field">
              <span className="form-label">Portfolio URLs</span>
              <textarea
                className="form-input min-h-24"
                name="portfolio_urls"
                placeholder="One URL per line or comma-separated"
                required
              />
            </label>

            <label className="form-field">
              <span className="form-label">Availability</span>
              <textarea
                className="form-input min-h-24"
                name="availability"
                placeholder="Current weekly capacity or next available date"
                required
              />
            </label>

            <label className="form-field">
              <span className="form-label">Rate expectations</span>
              <input
                className="form-input"
                name="rate_expectations"
                placeholder="Minimum project value or typical range"
                required
              />
            </label>

            <label className="form-field">
              <span className="form-label">Source or referrer</span>
              <input className="form-input" name="source_channel" />
            </label>

            <div className="grid gap-3 border-t border-slate-200 pt-5 text-sm leading-6 text-slate-700">
              <label className="flex gap-3">
                <input name="age_eligible_confirmed" required type="checkbox" />
                <span>I confirm I am 18 or older.</span>
              </label>
              <label className="flex gap-3">
                <input name="privacy_confirmed" required type="checkbox" />
                <span>I understand my application is reviewed privately.</span>
              </label>
              <label className="flex gap-3">
                <input name="policy_confirmed" required type="checkbox" />
                <span>
                  I will not accept requests for prohibited academic cheating,
                  exams, impersonation, or deceptive submission work.
                </span>
              </label>
            </div>

            <button className="button-primary mt-2" type="submit">
              Submit provider application
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
