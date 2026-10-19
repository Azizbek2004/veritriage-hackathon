"use client";

import React, { useState } from "react";

interface MarkdownDocViewerProps {
  markdown: string;
  docId: string;
  caseId: string;
  signedBy?: string | null;
  hash?: string;
  apiBaseUrl: string;
  onBack: () => void;
  onSigned?: () => void;
}

export function MarkdownDocViewer({
  markdown,
  docId,
  caseId,
  signedBy,
  hash,
  apiBaseUrl,
  onBack,
  onSigned,
}: MarkdownDocViewerProps) {
  const [signing, setSigning] = useState(false);
  const [signStatus, setSignStatus] = useState<string | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<string | null>(null);

  async function handleSign() {
    setSigning(true);
    setSignStatus(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/documents/${docId}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signedBy: "MLRO Marie Svobodová" }),
      });
      if (res.ok) {
        setSignStatus("Document signed by MLRO Marie Svobodová");
        onSigned?.();
      } else {
        setSignStatus("Signing failed");
      }
    } catch {
      setSignStatus("Signing error");
    } finally {
      setSigning(false);
    }
  }

  async function handleVerify() {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/documents/${docId}/verify`);
      if (res.ok) {
        const data = await res.json();
        setVerifyStatus(data.valid ? "✅ SHA-256 Digest Verified" : "❌ Hash Mismatch");
      } else {
        setVerifyStatus("Verification failed");
      }
    } catch {
      setVerifyStatus("Verification error");
    }
  }

  // Parse markdown into rendered blocks
  const blocks = parseMarkdown(markdown);

  return (
    <div className="doc-viewer-container animate-fade-in">
      {/* Document Reader Action Bar */}
      <div className="doc-viewer-bar">
        <div className="doc-viewer-bar-left">
          <button type="button" className="btn-outline doc-back-btn" onClick={onBack}>
            ← Back to List
          </button>
          <div className="doc-viewer-id-box">
            <span className="doc-badge-format">FAÚ / ČNB DOSSIER</span>
            <span className="doc-viewer-id font-mono">{docId}</span>
          </div>
        </div>

        <div className="doc-viewer-bar-right">
          {signedBy ? (
            <span className="doc-signed-badge">
              ✓ Signed: {signedBy}
            </span>
          ) : (
            <button
              type="button"
              className="btn-primary doc-sign-btn"
              onClick={handleSign}
              disabled={signing}
            >
              {signing ? "Signing…" : "✍️ Sign (MLRO Key)"}
            </button>
          )}

          <button type="button" className="btn-outline" onClick={handleVerify}>
            🛡️ Verify Hash
          </button>

          <a
            className="btn-outline"
            href={`${apiBaseUrl}/api/v1/documents/${docId}`}
            download={`${docId}.md`}
          >
            📥 Markdown
          </a>

          <a
            className="btn-outline"
            href={`${apiBaseUrl}/api/v1/documents/${docId}/bundle`}
            download={`${docId}.zip`}
          >
            📦 Bundle (.zip)
          </a>
        </div>
      </div>

      {signStatus && (
        <div className="doc-status-banner ok">{signStatus}</div>
      )}
      {verifyStatus && (
        <div className="doc-status-banner ok">{verifyStatus}</div>
      )}

      {/* Rendered Document Sheet */}
      <div className="doc-sheet">
        <div className="doc-sheet-watermark">ČESKÁ NÁRODNÍ BANKA · AML COMPLIANCE AUDIT</div>
        {blocks.map((block, idx) => (
          <React.Fragment key={idx}>{renderBlock(block, idx)}</React.Fragment>
        ))}
      </div>
    </div>
  );
}

// Block Types for Markdown Parsing
type Block =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "callout"; title: string; lines: string[] }
  | { type: "table"; headers: string[]; alignments: ("left" | "right" | "center")[]; rows: string[][] }
  | { type: "list"; items: string[] }
  | { type: "paragraph"; text: string }
  | { type: "hr" };

function parseMarkdown(md: string): Block[] {
  const lines = md.split(/\r?\n/);
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    if (line.startsWith("# ")) {
      blocks.push({ type: "h1", text: line.slice(2).trim() });
      i++;
      continue;
    }

    if (line.startsWith("## ")) {
      blocks.push({ type: "h2", text: line.slice(3).trim() });
      i++;
      continue;
    }

    if (line.startsWith("### ")) {
      blocks.push({ type: "h3", text: line.slice(4).trim() });
      i++;
      continue;
    }

    if (line.startsWith("---")) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // Callout alert block: > [!IMPORTANT]
    if (line.startsWith(">")) {
      const calloutLines: string[] = [];
      let title = "IMPORTANT STATUTORY NOTICE";
      while (i < lines.length && lines[i].startsWith(">")) {
        let content = lines[i].replace(/^>\s?/, "").trim();
        if (content.startsWith("[!IMPORTANT]")) {
          title = "IMPORTANT COMPLIANCE AUDIT";
          content = content.replace("[!IMPORTANT]", "").trim();
        } else if (content.startsWith("[!NOTE]")) {
          title = "AUDIT NOTE";
          content = content.replace("[!NOTE]", "").trim();
        }
        if (content) calloutLines.push(content);
        i++;
      }
      blocks.push({ type: "callout", title, lines: calloutLines });
      continue;
    }

    // Markdown Table: line contains | and next line has |---|
    if (line.includes("|") && i + 1 < lines.length && lines[i + 1].includes("|") && lines[i + 1].includes("---")) {
      const headerLine = line;
      const alignLine = lines[i + 1];
      const headers = headerLine
        .split("|")
        .map((s) => s.trim())
        .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

      const alignments = alignLine
        .split("|")
        .map((s) => s.trim())
        .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
        .map((cell) => {
          if (cell.startsWith(":") && cell.endsWith(":")) return "center" as const;
          if (cell.endsWith(":")) return "right" as const;
          return "left" as const;
        });

      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim().startsWith("|")) {
        const rowCells = lines[i]
          .split("|")
          .map((s) => s.trim())
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        rows.push(rowCells);
        i++;
      }
      blocks.push({ type: "table", headers, alignments, rows });
      continue;
    }

    // Bullet list
    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].trim().startsWith("- ") || lines[i].trim().startsWith("* "))) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    // Regular paragraph
    blocks.push({ type: "paragraph", text: line });
    i++;
  }

  return blocks;
}

function renderBlock(block: Block, key: number) {
  switch (block.type) {
    case "h1":
      return (
        <div className="doc-h1-wrap" key={key}>
          <div className="doc-seal-badge">ČESKÁ NÁRODNÍ BANKA · AML DOSSIER</div>
          <h1 className="doc-h1">{block.text}</h1>
        </div>
      );

    case "h2":
      return (
        <h2 className="doc-h2" key={key}>
          {block.text}
        </h2>
      );

    case "h3":
      return (
        <h3 className="doc-h3" key={key}>
          {block.text}
        </h3>
      );

    case "callout":
      return (
        <div className="doc-callout-card" key={key}>
          <div className="doc-callout-header">
            <span className="doc-callout-icon">⚖️</span>
            <strong>{block.title}</strong>
          </div>
          <div className="doc-callout-body">
            {block.lines.map((l, li) => (
              <p key={li}>{renderInline(l)}</p>
            ))}
          </div>
        </div>
      );

    case "table":
      return (
        <div className="doc-table-wrap" key={key}>
          <table className="doc-table">
            <thead>
              <tr>
                {block.headers.map((h, hi) => (
                  <th
                    key={hi}
                    style={{ textAlign: block.alignments[hi] ?? "left" }}
                  >
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 1 ? "even-row" : "odd-row"}>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      style={{ textAlign: block.alignments[ci] ?? "left" }}
                    >
                      {renderCell(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "list":
      return (
        <ul className="doc-list" key={key}>
          {block.items.map((item, ii) => (
            <li key={ii}>{renderInline(item)}</li>
          ))}
        </ul>
      );

    case "hr":
      return <hr className="doc-hr" key={key} />;

    case "paragraph":
      return (
        <p className="doc-p" key={key}>
          {renderInline(block.text)}
        </p>
      );
  }
}

// Render cell contents with special badges for gates, amounts, and statuses
function renderCell(cell: string) {
  const trimmed = cell.trim();

  if (trimmed.includes("PASS") || trimmed.includes("✅")) {
    return (
      <span className="doc-pill pass">
        <span className="pill-dot ok" /> PASS
      </span>
    );
  }

  if (trimmed.includes("FAIL") || trimmed.includes("❌")) {
    return (
      <span className="doc-pill fail">
        <span className="pill-dot bad" /> FAIL
      </span>
    );
  }

  if (trimmed.includes("THIS ALERT") || trimmed.includes("🔴")) {
    return <span className="doc-pill alert-target">▶ THIS ALERT</span>;
  }

  if (trimmed.includes("PEP") || trimmed.includes("Politically Exposed")) {
    return <span className="doc-pill pep">PEP (§ 21(5))</span>;
  }

  if (trimmed === "ESCALATE") {
    return <span className="doc-pill escalate">ESCALATE</span>;
  }

  if (trimmed === "AUTO_CLEAR") {
    return <span className="doc-pill clear">AUTO_CLEAR</span>;
  }

  if (trimmed === "COMPLIANT") {
    return <span className="doc-pill pass">COMPLIANT</span>;
  }

  if (trimmed === "FIRED") {
    return <span className="doc-pill fired">FIRED</span>;
  }

  return renderInline(cell);
}

// Render inline markdown: bold, code, links
function renderInline(text: string): React.ReactNode {
  // Simple token parser for `code`, **bold**, [link](url)
  const tokens: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Code: `code`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      tokens.push(
        <code className="doc-code-chip" key={key++}>
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Bold: **bold**
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      tokens.push(
        <strong className="doc-strong" key={key++}>
          {boldMatch[1]}
        </strong>
      );
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Link: [text](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      tokens.push(
        <a
          href={linkMatch[2]}
          target="_blank"
          rel="noreferrer"
          className="doc-link"
          key={key++}
        >
          {linkMatch[1]}
        </a>
      );
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // Plain text up to the next special character
    const nextSpecial = remaining.search(/[`*\[]/);
    if (nextSpecial === -1) {
      tokens.push(remaining);
      break;
    } else if (nextSpecial === 0) {
      tokens.push(remaining[0]);
      remaining = remaining.slice(1);
    } else {
      tokens.push(remaining.slice(0, nextSpecial));
      remaining = remaining.slice(nextSpecial);
    }
  }

  return <>{tokens}</>;
}
