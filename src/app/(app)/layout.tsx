import Link from "next/link";
import { GlobalHeader } from "@/components/site/global-header";
import { requireUser } from "@/lib/auth/user";
import { getMyUnreadMessageCount } from "@/lib/engagement/chat";
import { getWorkspaceNavItems } from "@/lib/workspace/roles";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { supabase, user } = await requireUser();
  const navItems = getWorkspaceNavItems(user.profile.role);
  const unreadMessageCount = await getMyUnreadMessageCount(supabase);

  return (
    <div className="min-h-screen bg-slate-50">
      <GlobalHeader viewer={user} />
      <div className="border-b border-slate-200 bg-white">
        <nav
          aria-label="Workspace navigation"
          className="page-shell flex gap-2 overflow-x-auto py-3 text-sm font-bold text-slate-700"
        >
          {navItems.map((item) => (
            <Link
              className="shrink-0 rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-slate-950"
              href={item.href}
              key={item.href}
            >
              <span>{item.label}</span>
              {item.href === "/app/messages" && unreadMessageCount > 0 ? (
                <span className="ml-2 rounded-full bg-blue-700 px-2 py-0.5 text-xs text-white">
                  {unreadMessageCount}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>
      </div>
      <main className="page-shell py-6 sm:py-8 lg:py-10">{children}</main>
    </div>
  );
}
