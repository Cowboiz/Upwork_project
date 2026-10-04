import { EngagementList } from "@/components/workspace/engagement-list";
import { requireUser } from "@/lib/auth/user";
import { getMyEngagements } from "@/lib/workspace/data";
import { normalizePage } from "@/lib/workspace/pagination";

type EngagementsPageProps = {
  searchParams: Promise<{
    page?: string | string[];
  }>;
};

export default async function EngagementsPage({
  searchParams,
}: EngagementsPageProps) {
  const params = await searchParams;
  const page = normalizePage(params.page);
  const { supabase } = await requireUser();
  const result = await getMyEngagements(supabase, page);

  return (
    <div className="grid gap-6">
      <header>
        <p className="text-sm font-bold uppercase text-blue-700">Engagements</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          My engagements
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-600">
          Review matched work linked to your account.
        </p>
      </header>

      <EngagementList result={result} />
    </div>
  );
}
