import Link from "next/link";
import { isUserRole, normalizeUserRole } from "@/lib/auth/user-shared";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function getAuthEntry() {
  const supabase = await createSupabaseServerClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (claimsError || !userId) {
    return { href: "/login", label: "Sign in" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (!profile || !isUserRole(profile.role)) {
    return { href: "/login", label: "Sign in" };
  }

  const role = normalizeUserRole(profile.role);

  return role === "admin"
    ? { href: "/admin", label: "Admin dashboard" }
    : { href: "/app", label: "Dashboard" };
}

export async function PublicHeader() {
  const authEntry = await getAuthEntry();

  return (
    <header className="border-b border-slate-200 bg-white/95">
      <div className="page-shell flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center justify-between gap-4">
          <Link className="text-xl font-bold text-blue-700" href="/">
            ProjectMatch
          </Link>
          <Link className="button-primary lg:hidden" href="/request">
            Submit request
          </Link>
        </div>

        <nav
          aria-label="Public navigation"
          className="flex flex-wrap items-center gap-3 text-sm font-bold text-slate-700 lg:justify-end"
        >
          <Link className="hover:text-blue-700" href="/#how-it-works">
            How it works
          </Link>
          <Link className="hover:text-blue-700" href="/#requesters">
            For students/requesters
          </Link>
          <Link className="hover:text-blue-700" href="/#providers">
            For providers
          </Link>
          <Link className="hover:text-blue-700" href={authEntry.href}>
            {authEntry.label}
          </Link>
          <Link className="button-primary hidden lg:inline-flex" href="/request">
            Submit project
          </Link>
        </nav>
      </div>
    </header>
  );
}
