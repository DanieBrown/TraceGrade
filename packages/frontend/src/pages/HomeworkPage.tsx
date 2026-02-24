export default function HomeworkPage() {
  return (
    <main className="flex-1 overflow-y-auto bg-base" style={{ padding: '40px', maxWidth: '1200px' }}>
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-pri">Homework</h1>
          <p className="mt-1 font-body text-sm text-sec">Manage your homework assignments</p>
        </div>
        <button
          type="button"
          disabled
          className="inline-flex cursor-not-allowed items-center justify-center self-start rounded-lg px-5 py-2.5 font-display text-sm font-semibold opacity-60"
          style={{
            background: 'var(--accent-gold)',
            color: 'var(--bg-base)',
          }}
          aria-label="Create homework unavailable"
        >
          + Create Homework
        </button>
      </header>

      <section
        className="rounded-xl border bg-surface px-6 py-10 text-center"
        style={{ borderColor: 'var(--border)' }}
        aria-live="polite"
      >
        <h2 className="font-display text-lg font-semibold text-pri">Homework page ready</h2>
        <p className="mt-2 font-body text-sm text-sec">Homework data will appear here once loading is implemented.</p>
      </section>
    </main>
  )
}