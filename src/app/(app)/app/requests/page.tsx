import Link from "next/link";
import { ProjectRequestList } from "@/components/workspace/project-request-list";
import { requireUser } from "@/lib/auth/user";
import { getMyProjectRequests } from "@/lib/workspace/data";
import { normalizePage } from "@/lib/workspace/pagination";
import { canViewRequests } from "@/lib/workspace/roles";

type RequestsPageProps = {
  searchParams: Promise<{
    page?: string | string[];
  }>;
};

export default async function RequestsPage({ searchParams }: RequestsPageProps) {
  const params = await searchParams;
  const page = normalizePage(params.page);
  const { supabase, user } = await requireUser();

  if (!canViewRequests(user.profile.role)) {
    return (
      <div className="grid gap-6">
        <header>
          <p className="text-sm font-bold uppercase text-blue-700">
            Requests / Projects
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            Provider workspace
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-600">
            Provider applications are available in your provider workspace.
          </p>
        </header>
        <Link className="button-primary w-fit" href="/app/provider">
          View provider applications
        </Link>
      </div>
    );
  }

  const result = await getMyProjectRequests(supabase, page);

  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase text-blue-700">
            Requests / Projects
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            My project requests
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-600">
            Review the project requests linked to your account.
          </p>
        </div>
        <Link className="button-primary" href="/request">
          Submit project request
        </Link>
      </header>

      <ProjectRequestList result={result} />
    </div>
  );
}
