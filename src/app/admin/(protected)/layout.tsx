import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { logoutAdmin } from "../login/actions";

export default async function ProtectedAdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireAdmin();

  return (
    <main className="page-shell py-8">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link className="text-sm font-bold text-blue-700" href="/">
            ProjectMatch
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">
            Admin review
          </h1>
          <nav className="mt-3 flex flex-wrap gap-3 text-sm font-bold">
            <Link className="text-blue-700" href="/admin/requests">
              Requests
            </Link>
            <Link className="text-blue-700" href="/admin/providers">
              Providers
            </Link>
          </nav>
        </div>

        <form action={logoutAdmin}>
          <button className="button-secondary" type="submit">
            Sign out
          </button>
        </form>
      </header>

      <div className="py-6">{children}</div>
    </main>
  );
}
