import { ProviderApplicationList } from "@/components/workspace/provider-application-list";
import { requireUser } from "@/lib/auth/user";
import { getMyProviderApplications } from "@/lib/workspace/data";
import { normalizePage } from "@/lib/workspace/pagination";
import { canViewProviderApplications } from "@/lib/workspace/roles";

type ProviderPageProps = {
  searchParams: Promise<{
    page?: string | string[];
  }>;
};

export default async function ProviderPage({ searchParams }: ProviderPageProps) {
  const params = await searchParams;
  const page = normalizePage(params.page);
  const { supabase, user } = await requireUser();

  if (!canViewProviderApplications(user.profile.role)) {
    return (
      <div className="grid gap-6">
        <header>
          <p className="text-sm font-bold uppercase text-blue-700">
            Provider applications
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            Provider workspace unavailable
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-600">
            Provider application status appears for freelancer or both-role
            accounts.
          </p>
        </header>
      </div>
    );
  }

  const result = await getMyProviderApplications(supabase, page);

  return (
    <div className="grid gap-6">
      <header>
        <p className="text-sm font-bold uppercase text-blue-700">
          Provider applications
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          My provider application(s)
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-600">
          Track provider application status and matching readiness.
        </p>
      </header>

      <ProviderApplicationList result={result} />
    </div>
  );
}
