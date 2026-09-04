import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import {
  markIntegrityClear,
  markNeedsClarification,
  markReviewed,
  rejectRequest,
  updateInternalNotes,
} from "./actions";

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

type AdminRequestDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
    saved?: string;
  }>;
};

export default async function AdminRequestDetailPage({
  params,
  searchParams,
}: AdminRequestDetailPageProps) {
  const [{ id }, notices] = await Promise.all([params, searchParams]);
  const { supabase } = await requireAdmin();
  const { data: request, error } = await supabase
    .from("project_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !request) {
    notFound();
  }

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link className="text-sm font-bold text-blue-700" href="/admin/requests">
            Back to requests
          </Link>
          <p className="mt-6 text-sm font-bold uppercase tracking-[0.12em] text-blue-700">
            Request detail
          </p>
          <h2 className="mt-2 text-3xl font-bold text-slate-950">
            {request.requester_name}
          </h2>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <div>
            <span className="font-bold text-slate-600">Request:</span>{" "}
            {formatStatus(request.status)}
          </div>
          <div className="mt-2">
            <span className="font-bold text-slate-600">Integrity:</span>{" "}
            {formatStatus(request.integrity_review_status)}
          </div>
        </div>
      </div>

      {notices.error ? (
        <div className="notice-error">{notices.error}</div>
      ) : null}

      {notices.saved ? (
        <div className="notice-success">Request update saved.</div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-6">
          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h3 className="text-xl font-bold text-slate-950">Private request</h3>
            <dl className="mt-5 grid gap-5 sm:grid-cols-2">
              <DetailItem label="Contact method" value={request.contact_method} />
              <DetailItem label="Contact detail" value={request.contact_value} />
              <DetailItem
                label="School or context"
                value={request.school_or_context}
              />
              <DetailItem label="Category" value={formatStatus(request.category)} />
              <DetailItem
                label="Budget"
                value={`${formatStatus(request.budget_range)} ${request.currency}`}
              />
              <DetailItem
                label="Deadline"
                value={
                  request.deadline
                    ? `${request.deadline}${
                        request.deadline_flexible ? " (flexible)" : ""
                      }`
                    : request.deadline_flexible
                      ? "Flexible"
                      : null
                }
              />
              <DetailItem label="Source" value={request.source_channel} />
              <DetailItem label="Created" value={formatDate(request.created_at)} />
              <DetailItem label="Reviewed" value={formatDate(request.reviewed_at)} />
            </dl>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h3 className="text-xl font-bold text-slate-950">Description</h3>
            <p className="mt-4 whitespace-pre-wrap leading-7 text-slate-800">
              {request.description}
            </p>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h3 className="text-xl font-bold text-slate-950">Deliverables</h3>
            <p className="mt-4 whitespace-pre-wrap leading-7 text-slate-800">
              {request.desired_deliverables || "Not provided"}
            </p>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h3 className="text-xl font-bold text-slate-950">Asset links</h3>
            {request.asset_links.length > 0 ? (
              <ul className="mt-4 grid gap-2">
                {request.asset_links.map((link) => (
                  <li key={link}>
                    <a
                      className="font-bold text-blue-700"
                      href={link}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-slate-700">Not provided</p>
            )}
          </section>
        </div>

        <aside className="grid content-start gap-6">
          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h3 className="text-xl font-bold text-slate-950">Internal notes</h3>
            <form action={updateInternalNotes} className="mt-4 grid gap-4">
              <input name="request_id" type="hidden" value={request.id} />
              <textarea
                className="form-input min-h-40"
                defaultValue={request.internal_notes ?? ""}
                name="internal_notes"
              />
              <button className="button-primary" type="submit">
                Save notes
              </button>
            </form>
          </section>

          {request.rejection_reason ? (
            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <h3 className="text-xl font-bold text-slate-950">
                Rejection reason
              </h3>
              <p className="mt-4 whitespace-pre-wrap leading-7 text-slate-800">
                {request.rejection_reason}
              </p>
            </section>
          ) : null}

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h3 className="text-xl font-bold text-slate-950">Review actions</h3>
            <div className="mt-4 grid gap-3">
              <form action={markNeedsClarification}>
                <input name="request_id" type="hidden" value={request.id} />
                <button className="button-secondary w-full" type="submit">
                  Mark needs clarification
                </button>
              </form>

              <form action={markReviewed}>
                <input name="request_id" type="hidden" value={request.id} />
                <button className="button-secondary w-full" type="submit">
                  Mark reviewed
                </button>
              </form>

              <form action={markIntegrityClear}>
                <input name="request_id" type="hidden" value={request.id} />
                <button className="button-secondary w-full" type="submit">
                  Mark integrity clear
                </button>
              </form>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h3 className="text-xl font-bold text-slate-950">Reject request</h3>
            <form action={rejectRequest} className="mt-4 grid gap-4">
              <input name="request_id" type="hidden" value={request.id} />
              <label className="form-field">
                <span className="form-label">Rejection type</span>
                <select className="form-input" name="rejection_type" required>
                  <option value="non_integrity">Non-integrity rejection</option>
                  <option value="integrity">Academic-integrity rejection</option>
                </select>
              </label>
              <label className="form-field">
                <span className="form-label">Reason</span>
                <textarea
                  className="form-input min-h-28"
                  name="rejection_reason"
                  required
                />
              </label>
              <button className="button-primary" type="submit">
                Reject
              </button>
            </form>
          </section>
        </aside>
      </div>
    </section>
  );
}
