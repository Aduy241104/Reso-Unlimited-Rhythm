function App() {
  return (
    <main className="min-h-screen bg-slate-100 p-8 text-slate-900">
      <section className="mx-auto max-w-xl rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
        <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
          Tailwind Test
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">
          If this is styled, Tailwind is working
        </h1>
        <p className="mt-2 text-slate-600">
          Quick checks: spacing, colors, rounded corners, shadow, and hover.
        </p>
        <button className="mt-5 rounded-xl bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700">
          Tailwind test button
        </button>
      </section>
    </main>
  );
}

export default App;
