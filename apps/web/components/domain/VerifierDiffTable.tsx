"use client";

import { useEffect, useState } from "react";

type DiffRow = {
  metric: string;
  llm_proposal: string;
  verifier_output: string;
  gate_status: string;
  delta?: string | null;
};

const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:5000";

export default function VerifierDiffTable({ caseId }: { caseId: string }) {
  const [rows, setRows] = useState<DiffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showInterventions, setShowInterventions] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API}/api/v1/cases/${caseId}/diff`);
      if (!response.ok) throw new Error(`Diff ${response.status}`);
      const data = await response.json();
      setRows(Array.isArray(data.rows) ? data.rows : []);
    } catch {
      setError("Verifier diff unavailable.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [caseId]);

  return (
    <section className="diff-card" aria-label="LLM versus verifier">
      <div className="cluster-heading">
        <div>
          <div className="detail-label">Neuro-symbolic check</div>
          <div className="diff-subtitle">LLM proposal (representative) vs. C# verifier (executed)</div>
        </div>
        <label className="diff-toggle">
          <input type="checkbox" checked={showInterventions} onChange={(event) => setShowInterventions(event.target.checked)} />
          Show verifier interventions
        </label>
      </div>

      {loading ? (
        <div className="cluster-skeleton short" />
      ) : error ? (
        <div className="banner-violation"><strong>{error}</strong><button className="btn-outline" onClick={load}>Retry</button></div>
      ) : (
        <div className="diff-table-wrap">
          <table className="diff-table">
            <thead><tr><th>Check</th><th>Raw LLM</th><th>C# Verifier</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((row) => {
                const critical = row.gate_status === "OVERRIDDEN" || row.gate_status === "FAIL_CLOSED";
                if (!showInterventions && critical) return null;
                return (
                  <tr key={row.metric} className={critical ? "critical" : ""}>
                    <td>{row.metric}</td>
                    <td className="llm">{row.llm_proposal}</td>
                    <td className="verifier">{row.verifier_output}</td>
                    <td><span className={`gate gate-${row.gate_status.toLowerCase()}`}>{row.gate_status}{row.delta ? ` (${row.delta})` : ""}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
