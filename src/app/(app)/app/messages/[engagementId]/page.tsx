import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PaginationControls } from "@/components/workspace/pagination-controls";
import { requireUser } from "@/lib/auth/user";
import {
  getEngagementMessages,
  getEngagementThread,
} from "@/lib/engagement/chat";
import { isSendableEngagementStatus } from "@/lib/engagement/chat-rules";
import { normalizePage } from "@/lib/workspace/pagination";
import { formatDate } from "@/lib/workspace/status";
import { sendEngagementMessage } from "./actions";
import { ConversationRealtime } from "./conversation-realtime";

type ConversationPageProps = {
  params: Promise<{
    engagementId: string;
  }>;
  searchParams: Promise<{
    error?: string;
    page?: string | string[];
  }>;
};

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

export default async function ConversationPage({
  params,
  searchParams,
}: ConversationPageProps) {
  const { engagementId } = await params;
  const query = await searchParams;
  const page = normalizePage(query.page);
  const { supabase, user } = await requireUser();
  const [thread, messages] = await Promise.all([
    getEngagementThread(supabase, engagementId),
    getEngagementMessages(supabase, engagementId, page),
  ]);

  if (!thread) {
    notFound();
  }

  const readOnly = !isSendableEngagementStatus(thread.engagement_status);
  const messagingUnavailable = !thread.can_send && !readOnly;
  const clientMessageId = randomUUID();
  const latestMessageId = messages.rows.at(-1)?.id ?? null;

  return (
    <div className="grid gap-6">
      <ConversationRealtime
        engagementId={engagementId}
        latestMessageId={latestMessageId}
      />

      <header>
        <Link className="text-sm font-bold text-blue-700" href="/app/messages">
          Back to messages
        </Link>
        <p className="mt-6 text-sm font-bold uppercase text-blue-700">
          Messages
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          {formatStatus(thread.category)}
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-600">
          Conversation with {thread.counterparty_display_name}. Status:{" "}
          {formatStatus(thread.engagement_status)}.
        </p>
      </header>

      {query.error === "invalid" ? (
        <div className="notice-error">
          Enter a message between 1 and 4000 characters.
        </div>
      ) : null}

      {query.error === "unavailable" ? (
        <div className="notice-error">
          Messaging is currently unavailable for this engagement.
        </div>
      ) : null}

      {messages.error ? (
        <div className="notice-error">{messages.error}</div>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        {messages.rows.length === 0 ? (
          <p className="text-sm text-slate-600">No messages yet.</p>
        ) : (
          <ol className="grid gap-4">
            {messages.rows.map((message) => {
              const isOwnMessage = message.sender_profile_id === user.id;

              return (
                <li
                  className={[
                    "grid gap-1 rounded-lg border p-3",
                    isOwnMessage
                      ? "border-blue-200 bg-blue-50"
                      : "border-slate-200 bg-slate-50",
                  ].join(" ")}
                  key={message.id}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold uppercase text-slate-500">
                    <span>{isOwnMessage ? "You" : message.sender_display_name}</span>
                    <time>{formatDate(message.created_at)}</time>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">
                    {message.body}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {!messages.error ? (
        <PaginationControls
          nextLabel="Older"
          page={messages.page}
          pageCount={messages.pageCount}
          pathname={`/app/messages/${engagementId}`}
          previousLabel="Newer"
        />
      ) : null}

      {readOnly ? (
        <div className="notice-info">This conversation is read-only.</div>
      ) : null}

      {messagingUnavailable ? (
        <div className="notice-info">
          Messaging is currently unavailable for this engagement.
        </div>
      ) : null}

      {thread.can_send ? (
        <form
          action={sendEngagementMessage}
          className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        >
          <input name="clientMessageId" type="hidden" value={clientMessageId} />
          <input name="engagementId" type="hidden" value={engagementId} />
          <label className="form-field">
            <span className="form-label">Message</span>
            <textarea
              className="form-input min-h-32"
              maxLength={4000}
              name="body"
              required
            />
          </label>
          <button className="button-primary w-fit" type="submit">
            Send message
          </button>
        </form>
      ) : null}
    </div>
  );
}
