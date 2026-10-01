import Link from "next/link";
import { requireUser } from "@/lib/auth/user";
import { logoutUser } from "../login/actions";

const navItems = [
  { href: "/app", label: "Dashboard" },
  { href: "/app#projects", label: "Projects / Requests" },
  { href: "/app#messages", label: "Messages" },
  { href: "/app#profile", label: "Profile" },
];

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user } = await requireUser();

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl md:grid-cols-[240px_1fr]">
        <aside className="border-b border-slate-200 bg-white p-4 md:border-b-0 md:border-r md:p-6">
          <div className="flex flex-col gap-4">
            <div>
              <Link className="text-lg font-bold text-blue-700" href="/app">
                ProjectMatch
              </Link>
              <p className="mt-1 text-xs font-bold uppercase text-slate-500">
                {user.profile.role}
              </p>
            </div>

            <nav className="grid grid-cols-2 gap-2 text-sm font-bold md:grid-cols-1">
              {navItems.map((item) => (
                <Link
                  className="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <form action={logoutUser} className="md:mt-auto">
              <button className="button-secondary w-full" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </aside>

        <section className="p-4 sm:p-6 lg:p-8">{children}</section>
      </div>
    </main>
  );
}
