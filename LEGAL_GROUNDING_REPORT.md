# Legal Grounding Report

## Corpus

- Sections ingested: **12/12**
- Sections with quoted text: **12/12**
- Sections marked unavailable: **0/12**
- Source: human-approved exact text in `fixtures/legal_corpus_cnb_aml.json`; each entry has citation, title, `text_cs`, `text_en`, URL, `retrieved_at`, `source: human_approved`.
- No full-Act scrape; no vector database.

## Tools

- `lookup_statutory_provision(clause_id)`: **working** — `LegalCorpus.Lookup`, endpoint `/api/v1/legal/section/{clause_id}`, logged `[lookup_statutory_provision]` calls.
- `search_legal_text(query)`: **working** — endpoint `/api/v1/legal/search?q=...`.
- Tool calls per investigation: **4** for the PEP hero case (`S6-1A`, `S21-2`, `S6-1B`, `S21-5`), returned in `tool_calls` and injected into the prompt.
- Retrieval is deterministic C# in the agent pipeline, not LLM-initiated Bedrock `toolConfig`. The report and pitch must say so.

## CSV

- Reason column contains quoted clause: **yes**
- Example:
  `[AML-253-2008-S21-2] Act No. 253/2008 Coll. (Czech AML Act) § 21(2) "Povinná osoba zavede..." — https://www.zakonyprolidi.cz/cs/2008-253#p21; standard monitoring disposition...`
- The CSV remains 11 columns. The quoted reason is escaped correctly.

## Pitch Artifacts

- `SOLUTION_2PAGE.md`: written.
- `DEMO_SCRIPT.md` updated: yes — legal-grounding beat in the Bedrock investigation.
- `.agents/QA_WAR_ROOM.md` updated: yes — four legal-grounding answers, including the honest deterministic-tool boundary.

## Verification

- `dotnet test`: **26/26 passed** (24 existing + golden hero snapshot + determinism test); new analyzer/dossier endpoints manually verified.
- `npm run build`: green.
- CSV header: intact.
- 4-eyes bypass: blocked (400).
- Legal section endpoint: returns non-empty Czech text.
- Investigation: `statutes[]` with quoted clauses and `tool_calls[]`.
- Audit: `FILE_CHAIN`, 6/6 after approval.

## Honest assessment

- Legal grounding is **real**, not a template: the quoted Czech text is loaded from the 12-section corpus and returned by the tool.
- The gap: the LLM does not autonomously choose the tool; the deterministic pipeline retrieves and injects the text. The output shows the tool calls and quotes, and the docs state the boundary. Do not claim autonomous model tool use.
- The brief’s 8.20x hero values are not the actual K005397 data; the UI/CSV use 1.71x.
