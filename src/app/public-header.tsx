import Link from "next/link";
import { AccountMenu } from "@/app/account-menu";
import { getOptionalUser, type AuthenticatedUser } from "@/lib/auth/user";
import { logoutUser } from "./login/actions";

type GlobalHeaderProps = {
  viewer?: AuthenticatedUser | null;
};

function getDisplayName(viewer: AuthenticatedUser) {
  return (
    viewer.profile.fullName ??
    viewer.profile.username ??
    viewer.email ??
    "ProjectMatch account"
  );
}

export async function PublicHeader({ viewer }: GlobalHeaderProps) {
  const authState =
    viewer === undefined ? await getOptionalUser() : { user: viewer };
  const user = authState.user;

  return (
    <header className="border-b border-slate-200 bg-white/95 sticky top-0 z-10">
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
              admin={user.profile.role === "admin"}
              displayName={getDisplayName(user)}
              email={user.email}
              role={user.profile.role}
              signOutAction={logoutUser}
            />
          ) : null}
        </nav>
      </div>
    </header>
  );
}
