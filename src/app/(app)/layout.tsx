import Link from "next/link";
import { GlobalHeader } from "@/components/site/global-header";
import { requireUser } from "@/lib/auth/user";
import { canViewProviderApplications } from "@/lib/workspace/roles";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user } = await requireUser();
  const projectHref = canViewProviderApplications(user.profile.role)
    ? "/app/provider"
    : "/app/requests";
  const projectLabel =
    user.profile.role === "freelancer"
      ? "Provider applications"
      : "Requests / Projects";
  const navItems = [
    { href: "/app", label: "Overview" },
    { href: projectHref, label: projectLabel },
    { href: "/app/engagements", label: "Engagements" },
    { href: "/app/messages", label: "Messages" },
  ];

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
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <main className="page-shell py-6 sm:py-8 lg:py-10">{children}</main>
    </div>
  );
}
