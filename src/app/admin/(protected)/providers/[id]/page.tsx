import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ActivityTimeline } from "../../activity-timeline";
import { updateInternalNotes, updateProviderStatus } from "./actions";
import type { Database } from "@/types/database.types";

type EngagementFeedbackRow =
  Database["public"]["Tables"]["engagement_feedback"]["Row"];

type ProviderFeedbackItem = EngagementFeedbackRow & {
  project_request_id: string | null;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

function formatBoolean(value: boolean) {
  return value ? "Yes" : "No";
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-slate-900">{value || "Not provided"}</dd>
    </div>
  );
}

function TextList({ values }: { values: string[] }) {
  if (values.length === 0) {
    return <p className="text-slate-700">Not provided</p>;
  }

  return (
    <ul className="grid gap-2">
      {values.map((value) => (
        <li key={value}>{value}</li>
      ))}
    </ul>
  );
}

function LinkList({ values }: { values: string[] }) {
  if (values.length === 0) {
    return <p className="text-slate-700">Not provided</p>;
  }

  return (
    <ul className="grid gap-2">
      {values.map((value) => (
        <li key={value}>
          <a
            className="font-bold text-blue-700"
            href={value}
            rel="noreferrer"
            target="_blank"
          >
            {value}
          </a>
        </li>
      ))}
    </ul>
  );
}

type AdminProviderDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
    saved?: string;
  }>;
};

export default async function AdminProviderDetailPage({
  params,
  searchParams,
}: AdminProviderDetailPageProps) {
  const [{ id }, notices] = await Promise.all([params, searchParams]);
  const { supabase } = await requireAdmin();
  const adminSupabase = createSupabaseAdminClient();
  const { data: provider, error } = await supabase
    .from("provider_applications")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !provider) {
    notFound();
  }

  const { data: workflowEvents, error: workflowEventsError } = await supabase
    .from("workflow_events")
    .select(
      "id, actor_user_id, event_name, metadata, occurred_at, project_request_id, request_candidate_id, project_engagement_id",
    )
    .eq("provider_application_id", provider.id)
    .order("occurred_at", { ascending: true })
    .order("id", { ascending: true });

  if (workflowEventsError) {
    notFound();
  }

  const requestIdByEngagementId = new Map<string, string | null>();

  for (const event of workflowEvents) {
    if (
      event.event_name === "engagement_feedback_submitted" &&
      event.project_engagement_id
    ) {
      requestIdByEngagementId.set(
        event.project_engagement_id,
        event.project_request_id,
      );
    }
  }

  const engagementIds = [...requestIdByEngagementId.keys()];
  const { data: engagementFeedbackRows, error: engagementFeedbackError } =
    engagementIds.length > 0
      ? await adminSupabase
          .from("engagement_feedback")
          .select("id, project_engagement_id, rating, feedback_text, created_at")
          .in("project_engagement_id", engagementIds)
          .order("created_at", { ascending: false })
      : { data: [], error: null };

  if (engagementFeedbackError) {
    notFound();
  }

  const engagementFeedback: ProviderFeedbackItem[] = engagementFeedbackRows.map(
    (feedback) => ({
      ...feedback,
      project_request_id:
        requestIdByEngagementId.get(feedback.project_engagement_id) ?? null,
    }),
  );

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link className="text-sm font-bold text-blue-700" href="/admin/providers">
            Back to providers
          </Link>
          <p className="mt-6 text-sm font-bold uppercase tracking-[0.12em] text-blue-700">
            Provider detail
          </p>
          <h2 className="mt-2 text-3xl font-bold text-slate-950">
            {provider.applicant_name}
          </h2>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <div>
            <span className="font-bold text-slate-600">Status:</span>{" "}
            {formatStatus(provider.status)}
          </div>
          <div className="mt-2">
            <span className="font-bold text-slate-600">Reviewed:</span>{" "}
            {formatDate(provider.reviewed_at)}
          </div>
        </div>
      </div>

      {notices.error ? (
        <div className="notice-error">{notices.error}</div>
      ) : null}

      {notices.saved ? (
        <div className="notice-success">Provider update saved.</div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-6">
          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h3 className="text-xl font-bold text-slate-950">
              Private application
            </h3>
            <dl className="mt-5 grid gap-5 sm:grid-cols-2">
              <DetailItem
                label="Applicant name"
                value={provider.applicant_name}
              />
              <DetailItem
                label="Contact method"
                value={provider.contact_method}
              />
              <DetailItem
                label="Contact detail"
                value={provider.contact_value}
              />
              <DetailItem
                label="Availability"
                value={provider.availability}
              />
              <DetailItem
                label="Rate expectations"
                value={provider.rate_expectations}
              />
              <DetailItem label="Source" value={provider.source_channel} />
              <DetailItem
                label="Age eligible"
                value={formatBoolean(provider.age_eligible_confirmed)}
              />
              <DetailItem
                label="Privacy acknowledged"
                value={formatDate(provider.privacy_acknowledged_at)}
              />
              <DetailItem
                label="Policy accepted"
                value={formatDate(provider.policy_accepted_at)}
              />
              <DetailItem label="Status" value={formatStatus(provider.status)} />
              <DetailItem label="Reviewed by" value={provider.reviewed_by} />
              <DetailItem
                label="Reviewed at"
                value={formatDate(provider.reviewed_at)}
              />
              <DetailItem label="Created" value={formatDate(provider.created_at)} />
              <DetailItem label="Updated" value={formatDate(provider.updated_at)} />
            </dl>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h3 className="text-xl font-bold text-slate-950">Skills</h3>
            <div className="mt-4 leading-7 text-slate-800">
              <TextList values={provider.skills} />
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h3 className="text-xl font-bold text-slate-950">
              Preferred project types
            </h3>
            <div className="mt-4 leading-7 text-slate-800">
              <TextList values={provider.preferred_project_types} />
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h3 className="text-xl font-bold text-slate-950">Portfolio URLs</h3>
            <div className="mt-4 leading-7 text-slate-800">
              <LinkList values={provider.portfolio_urls} />
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h3 className="text-xl font-bold text-slate-950">
              Student feedback
            </h3>
            {engagementFeedback.length > 0 ? (
              <div className="mt-4 grid gap-4">
                {engagementFeedback.map((feedback) => (
                  <article
                    className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                    key={feedback.id}
                  >
                    <dl className="grid gap-4 text-sm sm:grid-cols-2">
                      <DetailItem
                        label="Rating"
                        value={`${feedback.rating} / 5`}
                      />
                      <DetailItem
                        label="Submitted"
                        value={formatDate(feedback.created_at)}
                      />
                    </dl>
                    {feedback.feedback_text ? (
                      <p className="mt-4 whitespace-pre-wrap leading-7 text-slate-800">
                        {feedback.feedback_text}
                      </p>
                    ) : null}
                    {feedback.project_request_id ? (
                      <Link
                        className="mt-4 inline-block font-bold text-blue-700"
                        href={`/admin/requests/${feedback.project_request_id}`}
                      >
                        View request
                      </Link>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-slate-700">
                No student feedback has been submitted for this provider yet.
              </p>
            )}
          </section>
        </div>

        <aside className="grid content-start gap-6">
          <ActivityTimeline
            emptyMessage="No workflow events have been recorded for this provider yet."
            events={workflowEvents}
            showRequestLinks
          />

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h3 className="text-xl font-bold text-slate-950">Internal notes</h3>
            <form action={updateInternalNotes} className="mt-4 grid gap-4">
              <input name="provider_id" type="hidden" value={provider.id} />
              <textarea
                className="form-input min-h-40"
                defaultValue={provider.internal_notes ?? ""}
                name="internal_notes"
              />
              <button className="button-primary" type="submit">
                Save notes
              </button>
            </form>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h3 className="text-xl font-bold text-slate-950">Review actions</h3>
            <div className="mt-4 grid gap-3">
              <form action={updateProviderStatus}>
                <input name="provider_id" type="hidden" value={provider.id} />
                <input name="status" type="hidden" value="approved" />
                <button className="button-secondary w-full" type="submit">
                  Approve provider
                </button>
              </form>

              <form action={updateProviderStatus}>
                <input name="provider_id" type="hidden" value={provider.id} />
                <input name="status" type="hidden" value="waitlisted" />
                <button className="button-secondary w-full" type="submit">
                  Waitlist provider
                </button>
              </form>

              <form action={updateProviderStatus}>
                <input name="provider_id" type="hidden" value={provider.id} />
                <input name="status" type="hidden" value="rejected" />
                <button className="button-secondary w-full" type="submit">
                  Reject provider
                </button>
              </form>

              <form action={updateProviderStatus}>
                <input name="provider_id" type="hidden" value={provider.id} />
                <input name="status" type="hidden" value="inactive" />
                <button className="button-secondary w-full" type="submit">
                  Mark inactive
                </button>
              </form>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
