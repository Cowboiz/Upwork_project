import Link from "next/link";
import { PaginationControls } from "@/components/workspace/pagination-controls";
import { requireUser } from "@/lib/auth/user";
import { getMyEngagementThreads } from "@/lib/engagement/chat";
import { normalizePage } from "@/lib/workspace/pagination";
import { formatDate } from "@/lib/workspace/status";

type MessagesPageProps = {
  searchParams: Promise<{
    page?: string | string[];
  }>;
};

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

function formatSide(value: string) {
  return value === "student" ? "Requester" : "Provider";
}

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
  const params = await searchParams;
  const page = normalizePage(params.page);
  const { supabase } = await requireUser();
  const result = await getMyEngagementThreads(supabase, page);

  return (
    <div className="grid gap-6">
      <header>
        <p className="text-sm font-bold uppercase text-blue-700">Messages</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Messages</h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-600">
          Conversations connected to your active engagements.
        </p>
      </header>

      {result.error ? (
        <div className="notice-error">{result.error}</div>
      ) : null}

      {!result.error && result.rows.length === 0 ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">
            No conversations yet.
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Engagement conversations will appear once both participants are
            linked to an active engagement.
          </p>
        </section>
      ) : null}

      {result.rows.length > 0 ? (
        <div className="grid gap-4">
          {result.rows.map((thread) => (
            <Link
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
              href={`/app/messages/${thread.engagement_id}`}
              key={thread.engagement_id}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    {formatStatus(thread.category)}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {thread.counterparty_display_name}
                  </p>
                </div>
                <div className="text-sm font-bold text-slate-700">
                  <span>{formatStatus(thread.engagement_status)}</span>
                  {thread.unread_count > 0 ? (
                    <span className="ml-3 rounded-full bg-blue-700 px-2 py-1 text-xs text-white">
                      {thread.unread_count}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-[1fr_auto]">
                <p>
                  {thread.last_message_preview ?? "No messages yet"}
                </p>
                <p className="font-bold text-slate-700">
                  {formatSide(thread.participant_side)}
                </p>
              </div>
              <p className="mt-3 text-xs font-bold uppercase text-slate-500">
                Last activity{" "}
                {formatDate(thread.last_message_at ?? thread.created_at)}
              </p>
            </Link>
          ))}
        </div>
      ) : null}

      {!result.error ? (
        <PaginationControls
          page={result.page}
          pageCount={result.pageCount}
          pathname="/app/messages"
        />
      ) : null}
    </div>
  );
}
