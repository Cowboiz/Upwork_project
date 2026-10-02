import { GlobalHeader } from "@/components/site/global-header";
import { requireAdmin } from "@/lib/admin/auth";
import { AdminNav } from "./admin-nav";

export default async function ProtectedAdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user } = await requireAdmin();

  return (
    <div className="min-h-screen bg-slate-50">
      <GlobalHeader viewer={user} />
      <div className="mx-auto grid w-full max-w-[1440px] lg:grid-cols-[260px_1fr]">
        <aside className="border-b border-slate-200 bg-white p-4 lg:min-h-[calc(100vh-77px)] lg:border-b-0 lg:border-r lg:p-6">
          <div className="flex h-full flex-col gap-5">
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">
                Admin workspace
              </p>
              <div className="mt-2 w-fit rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-bold uppercase text-blue-700">
                Operator tools
              </div>
            </div>

            <AdminNav />
          </div>
        </aside>

        <main className="min-w-0 p-4 sm:p-6 xl:p-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
