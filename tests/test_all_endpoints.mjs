// Comprehensive Automated Test for all Frontend <-> Backend API Methods
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

const results = [];

async function test(name, method, path, body = null, expectedStatus = [200]) {
  const url = `${BASE_URL}${path}`;
  const start = Date.now();
  try {
    const opts = {
      method,
      headers: { "Content-Type": "application/json" },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    const duration = Date.now() - start;
    const ok = expectedStatus.includes(res.status);
    let preview = "";
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("json")) {
      const data = await res.json();
      preview = JSON.stringify(data).slice(0, 75);
      results.push({ name, method, path, status: res.status, ok, duration, preview, data });
    } else {
      const text = await res.text();
      preview = text.slice(0, 75).replace(/[\r\n]+/g, " ");
      results.push({ name, method, path, status: res.status, ok, duration, preview, text });
    }
  } catch (err) {
    results.push({ name, method, path, status: "ERR", ok: false, duration: Date.now() - start, preview: err.message });
  }
}

async function run() {
  console.log(`\n======================================================`);
  console.log(`  VERIFYING ALL BACKEND ENDPOINTS FOR FRONTEND`);
  console.log(`  Target: ${BASE_URL}`);
  console.log(`======================================================\n`);

  // 1. Health & Status
  await test("Health Check", "GET", "/api/v1/health");
  await test("Bedrock Probe / Status", "GET", "/api/v1/bedrock/status");
  await test("Dataset Stats", "GET", "/api/v1/dataset/stats");
  await test("Deliverable Stats", "GET", "/api/v1/deliverable/stats");
  await test("Deliverable Sample Queue", "GET", "/api/v1/deliverable/sample");
  await test("Deliverable CSV Export", "GET", "/api/v1/deliverable/csv");
  await test("Deliverable Reprocess", "POST", "/api/v1/deliverable/reprocess");

  // 2. 4-Eyes Separation Checks
  await test("4-Eyes Check (Independent - Valid)", "POST", "/api/v1/cases/verify-4-eyes", {
    executive: "Ing. Jan Novák",
    approver: "Ing. Jana Dvořáková"
  }, [200]);

  await test("4-Eyes Check (Same Person - Rejection)", "POST", "/api/v1/cases/verify-4-eyes", {
    executive: "Ing. Jan Novák",
    approver: "Ing. Jan Novák"
  }, [400]);

  // 3. Case Details (ALERT-045 hero case)
  await test("Case Transaction Detail", "GET", "/api/v1/cases/ALERT-045/transaction-detail");
  await test("Case Forensic Vectors", "GET", "/api/v1/cases/ALERT-045/vectors");
  await test("Case Difference / Diff", "GET", "/api/v1/cases/ALERT-045/diff");
  await test("Case Explanation Snapshot", "GET", "/api/v1/cases/ALERT-045/explanation");
  await test("Case Determinism Check", "POST", "/api/v1/verify/determinism/ALERT-045");
  await test("Case Audit Log", "GET", "/api/v1/cases/ALERT-045/audit");
  await test("Case Audit Chain Verification", "GET", "/api/v1/cases/ALERT-045/audit/verify");
  await test("Case Existing Documents List", "GET", "/api/v1/cases/ALERT-045/documents");
  await test("Case Existing Dossiers List", "GET", "/api/v1/cases/ALERT-045/dossiers");
  await test("Client Transaction Cluster (K000076)", "GET", "/api/v1/clients/K000076/cluster?transactionId=TX-K000076-0076");

  // 4. Deep Analysis & Document Lifecycle
  await test("Deep Analysis Document Generation", "POST", "/api/v1/cases/ALERT-045/deep-analysis?generatedBy=analyst.demo");
  const deepAnalysisResult = results[results.length - 1];
  let docId = deepAnalysisResult?.data?.documentId;
  let dossierId = deepAnalysisResult?.data?.dossierId;

  if (docId) {
    await test("Get Generated Document Content", "GET", `/api/v1/documents/${docId}`);
    await test("Verify Document Hash", "GET", `/api/v1/documents/${docId}/verify`);
    await test("Sign Generated Document", "POST", `/api/v1/documents/${docId}/sign`, { signedBy: "Marie Svobodová (MLRO)" });
    await test("Download Lawyer Bundle ZIP", "GET", `/api/v1/documents/${docId}/bundle`);
  }

  if (dossierId) {
    await test("Verify Dossier Signature", "GET", `/api/v1/dossiers/${dossierId}/verify`);
    await test("Sign Dossier", "POST", `/api/v1/dossiers/${dossierId}/sign`, { signedBy: "Marie Svobodová (MLRO)" });
    await test("Export Dossier (HTML)", "GET", `/api/v1/dossiers/${dossierId}/export?format=html`);
    await test("Export Dossier (Markdown)", "GET", `/api/v1/dossiers/${dossierId}/export?format=md`);
  }

  // 5. Stress-Testing Engine
  await test("Stress-Test Realtime Simulation", "POST", "/api/v1/stress-test/run", { sample_size: 1000 });

  // 6. Approval with 4-eyes enforcement
  await test("Approve Rejection (Same Person)", "POST", "/api/v1/cases/ALERT-045/approve", {
    approver_id: "Ing. Jan Novák",
    signature_b64: "dGVzdA=="
  }, [400]);

  await test("Approve Success (Independent Officer)", "POST", "/api/v1/cases/ALERT-045/approve", {
    approver_id: "Marie Svobodová",
    signature_b64: "dGVzdA=="
  }, [200]);

  // 7. Legal Corpus & FATF Endpoints
  await test("Legal Provision Lookup (§ 6(1)(a))", "GET", "/api/v1/legal/section/AML-253-2008-S6-1A");
  await test("Legal Corpus Keyword Search", "GET", "/api/v1/legal/search?q=smurfing");
  await test("FATF Guidance Reference Lookup", "GET", "/api/v1/legal/fatf/FATF-R10");

  // Output summary
  console.log(`\n---------------------------------------------------------------------------------------------------------`);
  console.log(` METHOD | STATUS | DURATION | RESULT | ENDPOINT`);
  console.log(`---------------------------------------------------------------------------------------------------------`);
  let passed = 0;
  for (const r of results) {
    const statusStr = r.ok ? "PASS" : "FAIL";
    if (r.ok) passed++;
    const methodPad = r.method.padEnd(6);
    const codePad = String(r.status).padEnd(6);
    const msPad = `${r.duration}ms`.padStart(8);
    console.log(` ${methodPad} | ${codePad} | ${msPad} | [${statusStr}] | ${r.path}`);
  }
  console.log(`---------------------------------------------------------------------------------------------------------`);
  console.log(`\n  TEST SUMMARY: ${passed} / ${results.length} PASSED (${Math.round((passed / results.length) * 100)}%)\n`);

  if (passed !== results.length) {
    console.error("Some tests failed!");
    process.exit(1);
  }
}

run();
