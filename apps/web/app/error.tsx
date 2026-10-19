"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="shell">
      <div className="table-card" style={{ padding: 32, marginTop: 40 }}>
        <div className="brand-title">The cockpit hit an unexpected error</div>
        <p className="brand-subtitle" style={{ margin: "10px 0 18px" }}>
          The case data and audit endpoint are still available. Reload the cockpit to continue.
        </p>
        <button className="btn-primary" onClick={reset}>Reload cockpit</button>
      </div>
    </main>
  );
}
