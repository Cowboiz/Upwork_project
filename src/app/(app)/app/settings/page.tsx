export default function SettingsPage() {
  return (
    <div className="grid gap-6">
      <header>
        <p className="text-sm font-bold uppercase text-blue-700">
          Account settings
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Settings</h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-600">
          Account security, notifications, and workspace preferences will be
          added as the pilot expands.
        </p>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Coming next</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          This placeholder keeps the account menu route stable while the
          settings controls are finalized.
        </p>
      </section>
    </div>
  );
}
