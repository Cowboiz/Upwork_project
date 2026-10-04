import { requireAccount } from "@/lib/auth/user";
import { updateProfile } from "@/lib/auth/profile-actions";

type AccountProfilePageProps = {
  searchParams: {
    error?: string;
    updated?: string;
  };
};

export async function AccountProfilePage({
  searchParams,
}: AccountProfilePageProps) {
  const { user } = await requireAccount();

  return (
    <div className="grid gap-6">
      <header>
        <p className="text-sm font-bold uppercase text-blue-700">
          Personal information
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Profile</h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-600">
          Manage the account details used across your ProjectMatch workspace.
        </p>
      </header>

      {searchParams.updated === "1" ? (
        <div className="notice-success">Profile updated.</div>
      ) : null}

      {searchParams.error ? (
        <div className="notice-error">{searchParams.error}</div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <form
          action={updateProfile}
          className="grid gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        >
          <label className="form-field">
            <span className="form-label">Full name</span>
            <input
              className="form-input"
              defaultValue={user.profile.fullName ?? ""}
              maxLength={120}
              name="fullName"
              type="text"
            />
          </label>

          <label className="form-field">
            <span className="form-label">Username</span>
            <input
              className="form-input"
              defaultValue={user.profile.username ?? ""}
              maxLength={40}
              name="username"
              type="text"
            />
          </label>

          <button className="button-primary justify-self-start" type="submit">
            Save profile
          </button>
        </form>

        <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Account</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="font-bold text-slate-700">Email</dt>
              <dd className="mt-1 text-slate-600">
                {user.email ?? "Not available"}
              </dd>
            </div>
            <div>
              <dt className="font-bold text-slate-700">Role</dt>
              <dd className="mt-1 text-slate-600">{user.profile.role}</dd>
            </div>
          </dl>
        </aside>
      </section>
    </div>
  );
}
