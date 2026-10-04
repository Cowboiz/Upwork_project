import Link from "next/link";
import { AccountMenu } from "@/components/account/account-menu";
import {
  getAccountDisplayName,
  getAccountRoleLabel,
} from "@/lib/auth/account-identity";
import { getAccountMenuItems } from "@/lib/auth/account-menu";
import { getOptionalUser, type AuthenticatedUser } from "@/lib/auth/user";
import { logoutUser } from "@/app/login/actions";

type GlobalHeaderProps = {
  viewer?: AuthenticatedUser | null;
};

export async function GlobalHeader({ viewer }: GlobalHeaderProps) {
    const user =
      viewer === undefined ? await getOptionalUser() : viewer;

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95">
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
          aria-label="Global navigation"
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
          {user ? null : (
            <>
              <Link className="hover:text-blue-700" href="/login">
                Sign in
              </Link>
              <Link className="button-secondary" href="/register">
                Create account
              </Link>
            </>
          )}
          <Link className="button-primary hidden lg:inline-flex" href="/request">
            Submit project
          </Link>
          {user ? (
            <AccountMenu
              displayName={getAccountDisplayName(user)}
              email={user.email}
              items={getAccountMenuItems(user.profile.role)}
              roleLabel={getAccountRoleLabel(user.profile.role)}
              signOutAction={logoutUser}
            />
          ) : null}
        </nav>
      </div>
    </header>
  );
}
