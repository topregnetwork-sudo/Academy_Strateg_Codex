# HH owner one-row readback — fail-closed handoff V1

Date: `2026-10-01`
Contour: `70 / Platform`
Cycle: `HH-EMPLOYER-INTEGRATION-PRODUCTION-V1`
Status: `LOCAL_DELTA_READY / LIVE_PREVIEW_BLOCKED_BEFORE_NEW_CREDENTIAL_AND_DEPLOY_GATE`

## Exact authorized action and boundary

The requested live action was one owner-only preview of exactly one protected
`CHELYABINSK_PROVEN` HH chat-link row. The allowed maximum was `max_read=1`.
No message send, HH message read, viewed marker mutation, unread counter
mutation, vacancy/status action, candidate creation, outbound job or live route
activation was authorized.

The protected row was not read. The deployed implementation at commit
`a35e1dee5bd4cc4453f7ffd3f25c670702ca9f15` uses `LIMIT 20`, so calling it with
a valid bearer could return more than the authorized maximum. The live route
also returned `404` without Authorization, which under the deployed contract
means `HH_CHAT_READBACK_TOKEN` is absent or shorter than 32 characters. No
secret value was requested, printed or stored.

## Live baseline and before/after markers

- Versioned deployment evidence identifies active Timeweb deployment
  `910e5a4f-0507-441f-9943-f8262d7a80ae`, commit `a35e1de...`, with successful
  build/container/deploy readback.
- Remote branch readback on this run returned exact head
  `a35e1dee5bd4cc4453f7ffd3f25c670702ca9f15` for
  `refs/heads/codex/hh-oauth-diagnostic`; rollback head remains
  `3bfc454abb258a1e4e2a614a64035c5a1fc4bbab`.
- Fresh public health: HTTP `200`, `enabled=true`, `schema=ready`,
  `connection=active`, `sync=ready`, no last error, chat-link status `partial`,
  immutable run/hash present.
- Before: unread chats `73`; `messages_read=0`; `sends=0`.
- Safe credential-presence probe: unauthenticated owner-readback GET only;
  status `404`; protected store query and row read did not occur.
- After: unread chats `73`; `messages_read=0`; `sends=0`.
- Record opaque alias: `NOT_READ_FAIL_CLOSED`.

The public health surface does not expose a commit SHA. Therefore the exact
active SHA is supported by the versioned Timeweb deployment evidence and the
fresh remote head readback; this run did not obtain a new authenticated Timeweb
deployment-metadata response.

## Minimal local delta

Baseline parent: `a35e1dee5bd4cc4453f7ffd3f25c670702ca9f15`.

1. The owner route now requires exactly one occurrence of each selector:
   `bucket=CHELYABINSK_PROVEN`, `run_id`, `snapshot_hash`, `owner_alias` and
   `max_read=1`.
2. Missing, duplicate or unexpected query parameters return `400` before the
   store is called.
3. The store independently validates the exact bucket, UUID-shaped run ID,
   64-hex snapshot hash, 24-hex `HC-` alias and `maxRead === 1`.
4. The requested run ID and snapshot must equal the latest immutable run.
5. SQL selects the exact alias with `LIMIT 1` and a window count; zero or more
   than one matching row fails closed.
6. A successful response explicitly reports `response_count=1`.
7. Response projection remains opaque and excludes provider IDs, negotiation
   IDs, names and message content.
8. The readback makes no HH provider call and no `/messages` call.
9. The change is bound to the already approved `CHELYABINSK_PROVEN` bucket and
   changes no vacancy lifecycle or active-acquisition rule.

File SHA-256:

- `academy_core/vercel_staging/lib/hh-runtime.js`:
  `6AAC8C43F94DD1793DBE88BE3AF2E5291C51C379E6811A66F04A4B2BF3E4F37D`
- `academy_core/vercel_staging/lib/hh-store.js`:
  `0779CF23AC57324CBBB3200977156C804DAF643F1281AD62C67D6641FDED1934`
- `academy_core/vercel_staging/tests/hh-production.test.js`:
  `E0386C84283420007DD18F4DDF8D0C2FAA9D27CE1AFA2AF589FCA0514DD72EA2`
- `academy_core/vercel_staging/HH_PRODUCTION_OPERATIONS.md`:
  `8D561661406A9058BEFFA43A231149F08C6DD1A36AF3D9DF2A2D274085AE7CA8`

## Verification

- HH: `48/48 PASS`, including mandatory exact run/snapshot/alias selectors,
  wrong run, wrong snapshot, wrong alias, `max_read=2`, duplicate query
  parameter and duplicate database match rejection; store-not-called for
  malformed requests; literal SQL `LIMIT 1`; `response_count=1`; opaque
  projection; and no provider/messages call.
- Batman: `38/38 PASS`.
- `npm run check`: `PASS`.
- `npm run build`: `PASS`.
- `git diff --check`: `PASS`.
- Conflict-marker scan: `PASS`.
- Karkasnik, context fingerprint and contour ledger postflight gates: `PASS`.
- Tilda: unchanged baseline `6/9`; the same three fixtures lack the relay
  idempotency key. This delta does not touch Tilda.
- No `node_modules` was added to the isolated worktree. Tests reused the
  dependency installation from the shared canonical checkout through
  `NODE_PATH`.

## Effects and rollback

- `sends=0`.
- `messages_read=0`.
- unread before/after: `73 -> 73`.
- viewed effects: `0`; no HH message endpoint or `PUT .../read` was called.
- candidate creation: `0`.
- outbound jobs: `0`.
- live activation: `0`.
- production mutation in this run: `0`.

Local rollback: revert the commit containing this report and the four-file
delta. Existing live rollback remains deployment of
`3bfc454abb258a1e4e2a614a64035c5a1fc4bbab`. No rollback was executed.

## Gate package and stopping point

`blocked_resource`:

- creation/binding of a new protected `HH_CHAT_READBACK_TOKEN` in Timeweb App
  `258691`;
- deployment of the exact one-row delta;
- authenticated Timeweb metadata readback proving the deployed SHA;
- only then, one bearer-authenticated owner readback with
  `bucket=CHELYABINSK_PROVEN`, exact approved `run_id`, exact approved
  `snapshot_hash`, exact approved `owner_alias`, and `max_read=1`.

These are new credential and production mutations and require a new exact
action-time gate. The gate must name the target app, exact commit, environment
variable name without its value, exact immutable run/snapshot/opaque-alias
selectors, one-row URL contract, `max_read=1`, no-send and no-viewed
invariants, before/after markers, and rollback SHA.

`unblocked_work`: local one-row fail-closed implementation, tests, hashes,
diff review and rollback package are complete.

`next_external_check`: after the owner confirms the exact credential-bind plus
deployment package, bind a unique 32+ character token without exposing it,
deploy the exact commit, read back the active SHA and variable name only, then
perform exactly one protected row preview and verify unread/messages-read/
viewed/sends markers remain unchanged.

Verdict: `READY_FOR_NEW_ACTION_TIME_GATE / PHYSICAL_ONE_ROW_E2E_NOT_RUN`.
