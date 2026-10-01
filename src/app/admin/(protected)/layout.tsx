import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { logoutAdmin } from "../login/actions";
import { AdminNav } from "./admin-nav";

export default async function ProtectedAdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireAdmin();

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto grid min-h-screen w-full max-w-[1440px] lg:grid-cols-[260px_1fr]">
        <aside className="border-b border-slate-200 bg-white p-4 lg:border-b-0 lg:border-r lg:p-6">
          <div className="flex h-full flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Link className="text-xl font-bold text-blue-700" href="/admin">
                ProjectMatch
              </Link>
              <div className="w-fit rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-bold uppercase text-blue-700">
                Admin
              </div>
            </div>

            <AdminNav />

            <form action={logoutAdmin} className="lg:mt-auto">
              <button className="button-secondary w-full" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </aside>

        <section className="min-w-0 p-4 sm:p-6 xl:p-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </section>
      </div>
    </main>
  );
}
