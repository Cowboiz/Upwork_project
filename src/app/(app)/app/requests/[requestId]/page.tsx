import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/workspace/status-badge";
import { requireUser } from "@/lib/auth/user";
import { getMyProjectRequestDetail } from "@/lib/workspace/data";
import { isUuid } from "@/lib/workspace/route-params";
import { formatDate } from "@/lib/workspace/status";

type RequestDetailPageProps = {
  params: Promise<{
    requestId: string;
  }>;
};

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="font-bold text-slate-700">{label}</dt>
      <dd className="mt-1 text-slate-600">{value}</dd>
    </div>
  );
}

export default async function RequestDetailPage({
  params,
}: RequestDetailPageProps) {
  const { requestId } = await params;

  if (!isUuid(requestId)) {
    notFound();
  }

  const { supabase } = await requireUser();
  const request = await getMyProjectRequestDetail(supabase, requestId);

  if (!request) {
    notFound();
  }

  return (
    <div className="grid gap-6">
      <header>
        <Link className="text-sm font-bold text-blue-700" href="/app/requests">
          Back to requests
        </Link>
        <p className="mt-6 text-sm font-bold uppercase text-blue-700">
          Request details
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          {request.category}
        </h1>
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusBadge tone="blue" value={request.status} />
          <StatusBadge value={request.integrity_review_status} />
        </div>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Project brief</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
          {request.description}
        </p>
        {request.desired_deliverables ? (
          <div className="mt-5">
            <h3 className="font-bold text-slate-800">Desired deliverables</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
              {request.desired_deliverables}
            </p>
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Lifecycle</h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
          <DetailItem label="Budget" value={`${request.budget_range} ${request.currency}`} />
          <DetailItem
            label="Deadline"
            value={request.deadline_flexible ? "Flexible" : formatDate(request.deadline)}
          />
          <DetailItem label="Created" value={formatDate(request.created_at)} />
          <DetailItem label="Updated" value={formatDate(request.updated_at)} />
          <DetailItem
            label="Provider response"
            value={request.provider_response_status ?? "Not available"}
          />
          <DetailItem
            label="Student decision"
            value={request.student_decision_status ?? "Not available"}
          />
        </dl>
        {request.engagement_id ? (
          <Link
            className="button-primary mt-5 w-fit"
            href={`/app/engagements/${request.engagement_id}`}
          >
            View engagement
          </Link>
        ) : (
          <p className="mt-5 text-sm text-slate-600">
            No linked engagement is available yet.
          </p>
        )}
      </section>
    </div>
  );
}
