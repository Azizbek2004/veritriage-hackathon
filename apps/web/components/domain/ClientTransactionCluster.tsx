"use client";

import { useEffect, useState } from "react";

type ClusterTxn = {
  id: string;
  date: string;
  amount_czk: number;
  currency: string;
  counterparty_account: string;
  direction: string;
  this_alert: boolean;
};

type Structuring = {
  detected: boolean;
  window_hours: number;
  threshold_czk: number;
  count: number;
  total_czk: number;
  transactions: ClusterTxn[];
};

type Shared = {
  counterparty_account: string;
  other_client_ids: string[];
};

type Cluster = {
  client_id: string;
  declared_expected_vol_2q26: number;
  actual_vol_2q26: number;
  vol_ratio: number;
  declared_expected_count_2q26: number;
  actual_count_2q26: number;
  count_ratio: number;
  pep_flag: boolean;
  aml_risk_score: string;
  sibling_transactions: ClusterTxn[];
  structuring_pattern: Structuring;
  shared_counterparty: Shared | null;
};

const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:5000";
const money = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

function formatCzk(value: number) {
  return `${money.format(value)} CZK`;
}

export default function ClientTransactionCluster({
  clientId,
  transactionId,
  onFilterClients,
}: {
  clientId: string;
  transactionId: string;
  onFilterClients?: (ids: string[]) => void;
}) {
  const [cluster, setCluster] = useState<Cluster | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `${API}/api/v1/clients/${encodeURIComponent(clientId)}/cluster?transactionId=${encodeURIComponent(transactionId)}`,
      );
      if (!response.ok) throw new Error(`Cluster ${response.status}`);
      setCluster(await response.json());
    } catch {
      setError("Client cluster unavailable.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [clientId, transactionId]);

  if (loading) {
    return (
      <section className="cluster-card" aria-label="Client transaction cluster">
        <div className="cluster-heading"><span>Client transaction cluster</span><span className="mono">loading…</span></div>
        <div className="cluster-skeleton" />
        <div className="cluster-skeleton short" />
      </section>
    );
  }

  if (error || !cluster) {
    return (
      <section className="cluster-card" aria-label="Client transaction cluster">
        <div className="cluster-heading"><span>Client transaction cluster</span></div>
        <div className="banner-violation">
          <strong>{error || "Cluster unavailable."}</strong>
          <button className="btn-outline" onClick={load}>Retry</button>
        </div>
      </section>
    );
  }

  const severity = Math.max(cluster.vol_ratio, cluster.count_ratio);
  const barTone = severity > 3 ? "red" : severity > 1.5 ? "amber" : "green";
  const maxVolume = Math.max(cluster.actual_vol_2q26, cluster.declared_expected_vol_2q26, 1);
  const maxCount = Math.max(cluster.actual_count_2q26, cluster.declared_expected_count_2q26, 1);
  const siblings = cluster.sibling_transactions;
  const visible = siblings.slice(0, 8);
  const flagged = siblings.find((tx) => tx.this_alert);
  if (flagged && !visible.some((tx) => tx.id === flagged.id)) visible.push(flagged);
  const patternIds = new Set(cluster.structuring_pattern.transactions.map((tx) => tx.id));

  return (
    <section className="cluster-card" aria-label="Client transaction cluster">
      <div className="cluster-heading">
        <div>
          <div className="detail-label">Client transaction cluster</div>
          <div className="brand-title small-title">{cluster.client_id}</div>
        </div>
        <span className={`cluster-ratio ${barTone}`}>
          {cluster.vol_ratio.toFixed(2)}x volume · {cluster.count_ratio.toFixed(2)}x count
        </span>
      </div>

      <div className="cluster-bars">
        <div className="cluster-bar-row">
          <div className="cluster-bar-label"><span>Declared 2Q2026</span><strong>{formatCzk(cluster.declared_expected_vol_2q26)} · {cluster.declared_expected_count_2q26} txns</strong></div>
          <div className="cluster-track"><div className="cluster-fill declared" style={{ width: `${(cluster.declared_expected_vol_2q26 / maxVolume) * 100}%` }} /></div>
          <div className="cluster-count">{cluster.declared_expected_count_2q26} / {maxCount}</div>
        </div>
        <div className="cluster-bar-row">
          <div className="cluster-bar-label"><span>Actual 2Q2026</span><strong>{formatCzk(cluster.actual_vol_2q26)} · {cluster.actual_count_2q26} txns</strong></div>
          <div className="cluster-track"><div className={`cluster-fill ${barTone}`} style={{ width: `${(cluster.actual_vol_2q26 / maxVolume) * 100}%` }} /></div>
          <div className="cluster-count">{cluster.actual_count_2q26} / {maxCount}</div>
        </div>
      </div>

      {cluster.structuring_pattern.detected && (
        <div className="structuring-banner">
          PATTERN: {cluster.structuring_pattern.count}x sub-threshold transfers &lt;{" "}
          {money.format(cluster.structuring_pattern.threshold_czk)} CZK in {cluster.structuring_pattern.window_hours}h · total{" "}
          {formatCzk(cluster.structuring_pattern.total_czk)}
        </div>
      )}

      <div className="sibling-table-wrap">
        <table className="sibling-table">
          <thead><tr><th>Date</th><th>Amount</th><th>Direction</th><th>Counterparty</th></tr></thead>
          <tbody>
            {visible.map((tx) => (
              <tr key={tx.id} className={`${tx.this_alert ? "flagged" : ""} ${patternIds.has(tx.id) ? "pattern" : ""}`}>
                <td className="mono">
                  {tx.this_alert && <span className="this-alert">▶ THIS ALERT </span>}
                  {tx.date}
                </td>
                <td className="mono amount">{formatCzk(tx.amount_czk)}</td>
                <td className="mono">{tx.direction}</td>
                <td className="mono">{tx.counterparty_account || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {cluster.shared_counterparty && (
        <button
          className="shared-counterparty"
          onClick={() => onFilterClients?.(cluster.shared_counterparty?.other_client_ids ?? [])}
        >
          ⚠ COUNTERPARTY ACROSS {cluster.shared_counterparty.other_client_ids.length} OTHER CLIENTS ·{" "}
          {cluster.shared_counterparty.other_client_ids.join(", ")}
        </button>
      )}
    </section>
  );
}
