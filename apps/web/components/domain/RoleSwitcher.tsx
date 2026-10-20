"use client";

import React from "react";

export type UserRole = "ANALYST" | "MLRO";

export interface ActiveUser {
  role: UserRole;
  name: string;
  title: string;
  statutoryRole: string;
}

export const USERS: Record<UserRole, ActiveUser> = {
  ANALYST: {
    role: "ANALYST",
    name: "Ing. Jan Novák",
    title: "L1/L2 AML Analyst",
    statutoryRole: "Vyšetřující analytik (§ 21 zák. 253/2008 Sb.)",
  },
  MLRO: {
    role: "MLRO",
    name: "Marie Svobodová",
    title: "Chief Compliance Officer & MLRO",
    statutoryRole: "Určená osoba (§ 22 zák. 253/2008 Sb.)",
  },
};

interface Props {
  activeUser: ActiveUser;
  onSwitch: (user: ActiveUser) => void;
}

export default function RoleSwitcher({ activeUser, onSwitch }: Props) {
  const isMlro = activeUser.role === "MLRO";

  return (
    <div className="role-switcher-container flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg p-1 text-xs">
      <div className="flex items-center gap-1.5 px-2 py-1 text-slate-400 font-mono">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span className="hidden sm:inline">Active Persona:</span>
      </div>

      <button
        type="button"
        onClick={() => onSwitch(USERS.ANALYST)}
        className={`px-2.5 py-1 rounded transition-all flex items-center gap-1.5 font-medium ${
          !isMlro
            ? "bg-blue-600 text-white shadow-sm font-semibold"
            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
        }`}
        title="L1 Analyst can investigate, inspect topology, and prepare § 20 filings. Cannot sign final approvals."
      >
        <span>👤</span>
        <span>Jan Novák</span>
        <span className="text-[10px] opacity-75 hidden md:inline">(Analyst)</span>
      </button>

      <button
        type="button"
        onClick={() => onSwitch(USERS.MLRO)}
        className={`px-2.5 py-1 rounded transition-all flex items-center gap-1.5 font-medium ${
          isMlro
            ? "bg-purple-600 text-white shadow-sm font-semibold"
            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
        }`}
        title="MLRO is the designated § 22 officer with legal signing authority for 4-eyes approvals and FAÚ transmissions."
      >
        <span>🛡️</span>
        <span>Marie Svobodová</span>
        <span className="text-[10px] opacity-75 hidden md:inline">(MLRO § 22)</span>
      </button>
    </div>
  );
}
