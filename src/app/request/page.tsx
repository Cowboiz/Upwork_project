import Link from "next/link";
import { submitProjectRequest } from "./actions";
import { budgetRanges, contactMethods, projectCategories } from "@/lib/stage1/options";

type RequestPageProps = {
  searchParams: Promise<{
    submitted?: string;
    error?: string;
  }>;
};

export default async function RequestPage({ searchParams }: RequestPageProps) {
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
            Student project request
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-slate-950 md:text-5xl">
            Tell us what you want to build.
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-700">
            Share enough detail for a manual review. Your contact details and
            project information are not published.
          </p>
          <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-700">
            Requests involving graded assignment completion, exams,
            impersonation, or deceptive academic submission are rejected.
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-7">
          {submitted ? (
            <div className="notice-success mb-6">
              Request submitted. We will review it manually and follow up with
              the next step.
            </div>
          ) : null}

          {error ? <div className="notice-error mb-6">{error}</div> : null}

          <form action={submitProjectRequest} className="grid gap-5">
            <label className="form-field">
              <span className="form-label">Name</span>
              <input className="form-input" name="requester_name" required />
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
                <input
                  className="form-input"
                  name="contact_value"
                  placeholder="email, handle, or phone"
                  required
                />
              </label>
            </div>

            <label className="form-field">
              <span className="form-label">School or context</span>
              <input
                className="form-input"
                name="school_or_context"
                placeholder="Optional"
              />
            </label>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="form-field">
                <span className="form-label">Project type</span>
                <select className="form-input" name="category" required>
                  {projectCategories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span className="form-label">Budget range</span>
                <select className="form-input" name="budget_range" required>
                  {budgetRanges.map((range) => (
                    <option key={range.value} value={range.value}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="form-field">
              <span className="form-label">Currency</span>
              <input
                className="form-input"
                name="currency"
                placeholder="USD"
                required
                maxLength={3}
                pattern="[A-Za-z]{3}"
              />
            </label>

            <label className="form-field">
              <span className="form-label">Description</span>
              <textarea
                className="form-input min-h-36"
                name="description"
                placeholder="Goal, audience, current assets, constraints, and what done looks like."
                required
              />
              <p className="form-help">Minimum 30 characters.</p>
            </label>

            <label className="form-field">
              <span className="form-label">Desired deliverables</span>
              <textarea
                className="form-input min-h-24"
                name="desired_deliverables"
                placeholder="Optional: pages, screens, files, features, or handoff format."
              />
            </label>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="form-field">
                <span className="form-label">Deadline</span>
                <input className="form-input" type="date" name="deadline" />
              </label>

              <label className="flex items-center gap-3 pt-8 text-sm font-bold text-slate-800">
                <input name="deadline_flexible" type="checkbox" />
                Deadline is flexible
              </label>
            </div>

            <label className="form-field">
              <span className="form-label">Relevant links</span>
              <textarea
                className="form-input min-h-24"
                name="asset_links"
                placeholder="Optional: docs, Figma, GitHub, references. One per line or comma-separated."
              />
            </label>

            <label className="form-field">
              <span className="form-label">How did you hear about this?</span>
              <input className="form-input" name="source_channel" />
            </label>

            <div className="grid gap-3 border-t border-slate-200 pt-5 text-sm leading-6 text-slate-700">
              <label className="flex gap-3">
                <input name="contact_permission_confirmed" required type="checkbox" />
                <span>You may contact me about this request.</span>
              </label>
              <label className="flex gap-3">
                <input name="age_eligible_confirmed" required type="checkbox" />
                <span>I confirm I am 18 or older.</span>
              </label>
              <label className="flex gap-3">
                <input name="integrity_attested" required type="checkbox" />
                <span>
                  This is a legitimate request and not prohibited coursework,
                  exam, impersonation, or deceptive academic submission work.
                </span>
              </label>
            </div>

            <button className="button-primary mt-2" type="submit">
              Submit project request
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
