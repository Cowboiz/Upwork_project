export default function MessagesPage() {
  return (
    <div className="grid gap-6">
      <header>
        <p className="text-sm font-bold uppercase text-blue-700">Messages</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Messages</h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-600">
          Chat is intentionally unavailable until the messaging phase.
        </p>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Coming later</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Engagement and application data are available now; direct messaging is
          not enabled yet.
        </p>
      </section>
    </div>
  );
}
