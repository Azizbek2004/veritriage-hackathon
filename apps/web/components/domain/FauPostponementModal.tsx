"use client";

import React, { useEffect, useState } from "react";

export interface FauPacketDto {
  fau_reference_number: string;
  obliged_entity_code: string;
  obliged_entity_name: string;
  designated_contact_person: string;
  filing_timestamp: string;
  postponement: {
    statutory_provision: string;
    postponement_status: string;
    postponed_at: string;
    statutory_24h_expiry: string;
    statutory_72h_fau_expiry: string;
    amount_czk: number;
    currency: string;
    holding_account_iban: string;
    asset_safeguard_measure: string;
    non_tipping_off_acknowledged: boolean;
  };
  subject: {
    client_id: string;
    legal_name: string;
    ico?: string;
    registered_address: string;
    pep_flag: boolean;
    kyc_risk_tier: string;
  };
  transaction: {
    transaction_id: string;
    amount_czk: number;
    source_iban: string;
    counterparty_iban: string;
    payment_rail: string;
    transaction_purpose: string;
  };
  statutory_typologies: string[];
  signoff: {
    investigating_analyst: string;
    signing_mlro: string;
    four_eyes_verified: boolean;
    receipt_sha256: string;
  };
}

interface Props {
  alertId?: string;
  caseId?: string;
  apiBase?: string;
  userRole?: "ANALYST" | "MLRO";
  userName?: string;
  activeUser?: { role: "ANALYST" | "MLRO"; name: string };
  onClose: () => void;
  onPostponed?: (packet: FauPacketDto) => void;
}

export default function FauPostponementModal({
  alertId,
  caseId,
  apiBase,
  userRole,
  userName,
  activeUser,
  onClose,
  onPostponed,
}: Props) {
  const targetId = alertId ?? caseId ?? "";
  const resolvedBase = apiBase ?? process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:5000";
  const resolvedRole = activeUser?.role ?? userRole ?? "ANALYST";
  const resolvedName = activeUser?.name ?? userName ?? "Ing. Jan Novák";
  const [data, setData] = useState<FauPacketDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [postponed, setPostponed] = useState(false);
  const [remaining24h, setRemaining24h] = useState<string>("24h 00m 00s");

  // Load existing report or state
  useEffect(() => {
    if (!targetId) return;
    fetch(`${resolvedBase}/api/v1/cases/${targetId}/fau-report`)
      .then((res) => (res.ok ? res.json() : null))
      .then((packet: FauPacketDto | null) => {
        if (packet) {
          setData(packet);
          setPostponed(true);
        }
      })
      .catch(() => {});
  }, [targetId, resolvedBase]);

  // Live countdown timer for 24h statutory clock
  useEffect(() => {
    if (!data?.postponement?.statutory_24h_expiry) return;
    const expiry = new Date(data.postponement.statutory_24h_expiry).getTime();

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = expiry - now;
      if (diff <= 0) {
        setRemaining24h("EXPIRED (Awaiting FAÚ Order)");
        clearInterval(interval);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setRemaining24h(`${hours}h ${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [data]);

  const triggerPostponement = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${resolvedBase}/api/v1/cases/${targetId}/postpone`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Role": resolvedRole,
          "X-User-Name": resolvedName,
        },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || errJson.error || `HTTP ${res.status}`);
      }

      const packet = await res.json();
      setData(packet);
      setPostponed(true);
      if (onPostponed) onPostponed(packet);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadXml = () => {
    window.open(`${resolvedBase}/api/v1/cases/${targetId}/fau-report/xml`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-2xl w-full p-6 text-slate-200 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏛️</span>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                FAÚ POSTPONEMENT & OPO FILING (§ 20 AML ACT)
              </h2>
              <p className="text-[10px] text-slate-400 font-mono">
                Zákon č. 253/2008 Sb. § 20 odst. 1 · Finanční analytický úřad ČR
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800 text-base font-bold"
          >
            ✕
          </button>
        </div>

        {/* Statutory Freeze Clocks Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className="p-3 bg-rose-950/50 border border-rose-800/80 rounded-lg font-mono">
            <div className="text-[10px] text-rose-300 uppercase font-semibold flex items-center justify-between">
              <span>Statutory 24h Freeze Window (§ 20(1))</span>
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            </div>
            <div className="text-lg font-bold text-rose-100 mt-1">{remaining24h}</div>
            <p className="text-[9.5px] text-rose-300/80 mt-1">
              Obliged entity is legally barred from executing this order until the clock expires.
            </p>
          </div>

          <div className="p-3 bg-purple-950/40 border border-purple-800/80 rounded-lg font-mono">
            <div className="text-[10px] text-purple-300 uppercase font-semibold">
              FAÚ 72h Investigation Clock (§ 20(3))
            </div>
            <div className="text-lg font-bold text-purple-100 mt-1">72h 00m Window</div>
            <p className="text-[9.5px] text-purple-300/80 mt-1">
              FAÚ may issue an administrative order extending postponement up to 3 business days.
            </p>
          </div>
        </div>

        {/* Freeze Particulars */}
        {data && (
          <div className="space-y-3 bg-slate-950 p-3.5 rounded border border-slate-800 font-mono text-[11px] mb-4">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-500 block text-[9.5px]">FAÚ REFERENCE NUMBER:</span>
                <span className="text-emerald-400 font-bold">{data.fau_reference_number}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9.5px]">FROZEN ASSET AMOUNT:</span>
                <span className="text-amber-400 font-bold">{data.postponement.amount_czk.toLocaleString()} CZK</span>
              </div>
            </div>

            <div>
              <span className="text-slate-500 block text-[9.5px]">TECHNICAL HOLDING ACCOUNT (CUSTODY):</span>
              <span className="text-slate-300 font-mono">{data.postponement.holding_account_iban}</span>
            </div>

            <div>
              <span className="text-slate-500 block text-[9.5px]">STATUTORY TYPOLOGY GROUNDS:</span>
              <ul className="list-disc list-inside text-slate-300 text-[10px] space-y-0.5 mt-0.5">
                {data.statutory_typologies.map((t, idx) => (
                  <li key={idx}>{t}</li>
                ))}
              </ul>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px]">
              <div>
                <span className="text-slate-500">Dual Officer 4-Eyes:</span>{" "}
                <span className="text-emerald-400 font-semibold">
                  {data.signoff.investigating_analyst} + {data.signoff.signing_mlro}
                </span>
              </div>
              <div className="text-slate-400">
                Receipt: <span className="text-slate-200">{data.signoff.receipt_sha256.slice(0, 16)}...</span>
              </div>
            </div>
          </div>
        )}

        {/* Non-Tipping-Off Statutory Reminder */}
        <div className="p-3 bg-amber-950/30 border border-amber-800/60 rounded flex items-start gap-2 mb-4">
          <span className="text-amber-400 text-sm">⚠</span>
          <p className="text-[10px] text-amber-200/90 leading-relaxed">
            <strong>§ 38 Non-Tipping-Off Duty (Povinnost mlčenlivosti):</strong> Under Czech Act No. 253/2008 Sb., you
            must strictly not inform the client, counterparty, or any third party that a postponement was ordered or an
            STR was filed with the FAÚ. Breach constitutes an administrative misdemeanor subject to CZK 5,000,000 fine.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-2 bg-rose-950 border border-rose-800 text-rose-300 rounded text-xs font-mono">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {postponed ? (
              <>
                <button
                  type="button"
                  onClick={downloadXml}
                  className="px-3.5 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 shadow"
                >
                  <span>📥</span> Download Official FAÚ XML
                </button>
                <span className="px-3 py-1.5 rounded bg-rose-900/60 border border-rose-700 text-rose-200 font-mono text-[11px] font-bold">
                  ✓ POSTPONED UNDER § 20
                </span>
              </>
            ) : (
              <button
                type="button"
                onClick={triggerPostponement}
                disabled={loading}
                className="px-4 py-2 rounded bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold flex items-center gap-2 shadow"
              >
                {loading ? (
                  <>
                    <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full"></span>
                    <span>Transmitting to FAÚ...</span>
                  </>
                ) : (
                  <>
                    <span>🔒</span>
                    <span>Order 24h Postponement & Transmit OPO (§ 20)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
