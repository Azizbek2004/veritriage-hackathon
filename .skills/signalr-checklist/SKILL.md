# SignalR Checklist — No Dead Air

## When to Use

Before any commit that touches:

- `src/PayShield.Api/Hubs/`
- `apps/web/lib/signalr.ts`
- `apps/web/components/QrSigningModal.tsx`
- `apps/web/components/DemoControls.tsx`
- Any server event payload or listener registration.
- The `/hubs/approvals` path, its auth, or its CORS policy.

Run every item. A single unchecked box blocks the commit.

## The Five Checks

### 1. Hub Method Names Match Frontend Listener Names

The server and client must agree exactly, including casing.

Server → client:

| Hub method | Frontend listener | Payload |
|---|---|---|
| `ApprovalRequested` | `connection.on("ApprovalRequested", ...)` | `ApprovalRequest` |
| `InvoiceUpdated` | `connection.on("InvoiceUpdated", ...)` | `InvoiceUpdate` |
| `PipelineProgress` | `connection.on("PipelineProgress", ...)` | `PipelineProgress` |

Client → server:

| Client invoke | Hub method |
|---|---|
| `connection.invoke("JoinCompany", companyId)` | `JoinCompany(string companyId)` |
| `connection.invoke("Ack", approvalId)` | `Ack(string approvalId)` |

Verify:

```bash
rg -n "ApprovalRequested|InvoiceUpdated|PipelineProgress|JoinCompany|Ack" src apps/web
```

Every server name must have exactly one matching client listener or invoke. A typo is a silent dead air bug: the server sends, the client never hears it, and the demo waits.

### 2. DTOs on Both Sides Are Identical

The server C# record and the TypeScript interface must have the same field names, types, nullability, and casing on the wire.

Check:

- The C# record is in `contracts/domain/` or `contracts/types/api.d.ts`.
- The TypeScript interface is in `contracts/types/api.d.ts`.
- JSON is camelCase on both sides.
- Nullable fields are optional or `| null` on both sides.
- Decimal amounts are numbers in JSON, `decimal` in C#, and `number` in TS.
- Dates are ISO-8601 strings on both sides.
- Enums are string literal unions, not numbers.

Verify with a serialization test:

```csharp
var json = JsonSerializer.Serialize(payload, JsonSerializerOptions.Web);
Assert.Equal(expectedJson, json);
```

```ts
const parsed: ApprovalRequest = JSON.parse(JSON.stringify(payload));
```

If the server adds a field, the TypeScript type is updated in the same task only if the contract already has it. A new field is a contract change and requires `DECISION.md`.

### 3. The Fallback Polling Path Exists and Is Tested

SignalR is the fast path. Polling is the safety net. The demo must survive a dead WebSocket.

Required:

- `apps/web/lib/signalr.ts` polls every 2 seconds when the connection is not `Connected`.
- Polling stops when the connection is `Connected`.
- Polling resumes on `Reconnecting` or `Disconnected`.
- The poll is idempotent: it fetches current state, not deltas.
- The UI renders the same data in polling and SignalR modes.
- A test forces a disconnect and asserts the poll runs and the UI updates.
- A test asserts polling stops after reconnect.
- No duplicate requests when both paths are active.

Verify:

```bash
rg -n "setInterval|2000|poll|fallback" apps/web/lib/signalr.ts
rg -n "disconnect|reconnect|fallback|poll" apps/web/tests
```

A fallback that is not tested is not a fallback. It is a comment.

### 4. Connection State Is Handled

Handle every state explicitly:

| State | UI signal | Behavior |
|---|---|---|
| `Connecting` | subtle "Connecting…" badge | Start the timeout; do not block the cockpit. |
| `Connected` | green dot or no badge | Live updates; stop polling. |
| `Reconnecting` | amber "Reconnecting…" badge | Start polling; keep the last state visible. |
| `Disconnected` | red "Offline — polling" badge | Poll; keep actions queued or disabled. |
| `Closed` | red "Connection closed" badge | Stop polling unless the page is reopened; offer retry. |
| `Error` | red "Connection error" badge | Log once; do not spam; offer retry. |

Rules:

- Never leave the analyst staring at a spinner with no explanation.
- Never show stale data as live.
- Never let a reconnect duplicate an approval request.
- Remove handlers with `connection.off(...)` before re-registering.
- Use one connection per page, not one per component.
- Do not block the initial render on the connection.

Verify with a test that simulates each state and asserts the visible badge or behavior. At minimum, test `Connecting`, `Reconnecting`, and `Disconnected`.

### 5. No Dead Air: Every State Transition Has a UI Signal

The 90-second demo cannot wait in silence. Every transition that affects the analyst must produce a visible signal within 200ms:

- Alert ingested → queue row appears or updates.
- Triage started → progress indicator on the case.
- Agent hop → evidence panel updates.
- Gate pass/fail → gate row flips within one frame of the event.
- Decision made → badge and override banner update.
- Approval requested → QR modal or phone prompt appears.
- Signature verified → green checkmark.
- Audit chain invalid → red banner, not a console log.
- Connection lost → badge, not a frozen screen.
- Batch complete → counters and elapsed time update.

A transition with no UI signal is dead air. Dead air is a demo failure even if the backend is correct.

Checklist per transition:

- [ ] Server emits the event.
- [ ] Client listener is registered exactly once.
- [ ] Client updates the store/query cache.
- [ ] Component re-renders.
- [ ] The change is visible at 1920×1080 from 5 meters.
- [ ] The change is asserted by a test or a rehearsal step.

## Additional Checks

### Auth and Tenancy

- `JoinCompany` requires an authenticated connection.
- A connection can only join its own company group.
- The demo JWT is accepted; no anonymous group join.
- CORS allows only the cockpit origin.
- The hub path is `/hubs/approvals`.

### Payload Size and Ordering

- Payloads are small (< 16 KB). Send ids and refetch large case data.
- The client tolerates out-of-order events.
- The client deduplicates by `approvalId` or `caseId`.
- `Ack` is idempotent.
- A missed event is recoverable by polling or refetch.

### Lifecycle

- The connection starts after the initial data fetch, not before.
- The connection is stopped on unmount.
- Handlers are removed on unmount.
- Strict Mode does not create two connections.
- Reconnect uses exponential backoff with jitter, capped at 15 seconds.
- The 2-second polling fallback starts only after the first reconnect attempt.

### Demo Safety

- If SignalR fails entirely, the QR signing flow still works via polling or manual refresh.
- The phone flow does not depend on the laptop's WebSocket.
- The cassette/Bedrock fallback does not block SignalR.
- The audit badge updates even in polling mode.
- The presenter can force offline mode with `NEXT_PUBLIC_USE_MOCK=1`.

## Verification Commands

```bash
# Names on both sides
rg -n "ApprovalRequested|InvoiceUpdated|PipelineProgress|JoinCompany|Ack" src apps/web

# Connection lifecycle
rg -n "start\(|stop\(|on\(|off\(|onreconnecting|onreconnected|onclose" apps/web

# Polling fallback
rg -n "setInterval|setTimeout|2000|poll" apps/web/lib/signalr.ts

# Hub surface
rg -n "class ApprovalsHub|Task |void |SendAsync|Clients" src/PayShield.Api/Hubs

# Contract DTOs
rg -n "ApprovalRequest|InvoiceUpdate|PipelineProgress" contracts apps
```

## Sign-Off

Paste this into the task's `REVIEW.md` or the PR description:

```markdown
## SignalR Checklist
- [ ] Hub names match client listeners.
- [ ] DTOs identical on both sides; serialization test.
- [ ] 2s polling fallback exists and is tested.
- [ ] Connection states handled: connecting, connected, reconnecting, disconnected, closed.
- [ ] Every transition has a UI signal; no dead air.
- [ ] Auth and company scoping verified.
- [ ] Handlers removed on unmount; one connection per page.
- [ ] Offline/mock path verified.
```

A SignalR commit with an unchecked box is `REJECT`. The demo moment is live; dead air is not a cosmetic bug.

## The Demo Moment

At 1:05 the phone buzzes. That buzz is a SignalR event (`ApprovalRequested`) that must arrive within one second of the decision, on a connection that may be reconnecting, while the laptop is also polling. If any of the five checks is missing, the phone does not buzz and the 90-second demo stops.

Treat this checklist as part of the demo script, not as infrastructure hygiene.
