# HH employer inbound production runbook

Scope: application #29768, `hh.ru`, manager Шипунов Максим Александрович,
employer `1702778`, authorized vacancy anchors `136453079` (Chelyabinsk) and
`136455388` (Minsk). This integration reads employer negotiation and bounded chat
metadata only. It does not read message bodies, send candidate messages,
change negotiation status, invite candidates, edit vacancies, or call Telegram.

## Protected configuration

Configure these as protected Timeweb variables; never put their values in Git,
chat, deployment logs, screenshots, or documentation:

- `HH_CLIENT_ID` and `HH_CLIENT_SECRET`: existing application #29768. Transfer
  directly from the HH protected view into Timeweb's protected editor.
- `HH_TOKEN_ENCRYPTION_KEY`: a unique 32-byte encryption key encoded as
  43-character base64url, padded base64, or exactly 64 hex characters. Keep a
  recoverable copy in the owner's approved secret manager. Losing it requires
  fresh manager authorization. Never rotate it while old tokens are stored
  without a migration plan.
- `HH_API_USER_AGENT`: app identifier and contact email in the format
  `AppName(contact@example.org)`; use the real owner-approved contact.
- `HH_SCHEMA_MIGRATE_ON_START=true` to create additive HH tables before OAuth.
- `HH_OAUTH_ENABLED=true` after the protected variables and schema are ready.
- `HH_WEBHOOK_ENABLED=true` only after the first full metadata sync and owner
  approval to create the single `NEW_NEGOTIATION_VACANCY` subscription.
- `HH_CHAT_READBACK_TOKEN`: optional, unique 32+ character protected bearer
  token for the owner-only chat metadata readback. If unset, that route is 404.
  Never reuse the OAuth encryption key or include this token in a URL or log.

The redirect URI is pinned in code to
`https://topregnetwork-sudo-academy-strateg-codex-59ae.twc1.net/integrations/hh/oauth/callback`.
The receiver URL is derived from that origin and an HMAC, never manually
entered into HH. Timeweb must deploy this branch/commit, not a previously
selected older commit. Existing Batman/Tilda environment variables must remain.

## Activation and readback

1. Run the local checks (`npm run build`, `npm run check`, `npm run test:batman`,
   `npm run test:tilda`, `npm run test:hh`). Save the exact commit and deployment
   ID in the contour handoff.
2. Deploy with the schema flag and OAuth enabled. Confirm the app and existing
   Batman/Tilda routes remain healthy. `/integrations/hh/health` must report
   `schema=ready` and `connection=awaiting_oauth`, with no token material.
3. The owner opens `/integrations/hh/oauth/start` in the same browser used for
   manager consent. Complete HH consent/OTP/CAPTCHA personally. The callback
   must report `HH_CONNECTED` for the expected manager/employer identifiers.
4. Check health until `sync=ready`. Verify each HH collection and page was
   traversed, metadata-only rows and checkpoints exist, retry has zero new
   inserts, and no messages or candidate actions occurred. Keep candidate PII
   out of evidence.
   The separate `chat_links` object reports a stable run ID/hash, observed time,
   Chelyabinsk/other chat counts and explicit unknowns. A `partial` status means
   no more than 100 participant metadata reads were done in that cycle; all
   unscanned chats remain unknown, not eligible. The owner-only route
   `/integrations/hh/chats/owner-readback?bucket=CHELYABINSK_PROVEN&page=0`
   requires `Authorization: Bearer <HH_CHAT_READBACK_TOKEN>` and returns at most
   20 opaque chat aliases per page. Never paste the response or token into a
   shared report. No message endpoint is used by this inventory.
5. Enable webhook only after a complete readback. Verify HH subscription ID and
   a bounded duplicate callback. The callback must trigger a reconciliation
   cycle; it must not send anything to Telegram.
6. Test an existing Telegram sender/relay independently. HH events remain in
   `awaiting_identity` until a proved person, journey and template association
   is separately approved. Telegram failure cannot roll back HH ingestion.

## Rollback and recovery

- Set `HH_OAUTH_ENABLED=false` and `HH_WEBHOOK_ENABLED=false`; redeploy or
  restart. This stops OAuth entry, polling and callback processing without
  changing existing Batman/Tilda behavior or deleting audit data.
- For only the chat-link addition, redeploy
  `codex/rollback-hh-chat-link-before-v1` (`b179318a5a482489d063c6cc31cab038dfd6b7b4`).
  Leave additive chat metadata tables in place for recoverability; revoke the
  optional readback token separately if it was configured.
- If a webhook subscription exists, disable/delete it in HH only after an
  owner-approved action-time step; record the subscription ID and readback.
- A failed refresh sets `recovery_required`: keep the connection disabled and
  redo manager OAuth. Do not print or export encrypted token boxes.
- A failed schema migration is fail-closed (`schema=failed`); diagnose in a
  protected database session. Do not run a destructive rollback of shared data.
