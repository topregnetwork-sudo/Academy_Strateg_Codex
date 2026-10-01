# HH owner one-row live E2E — rollback handoff V2

Date: `2026-10-01`
Contour: `70 / Platform`
Cycle: `HH-EMPLOYER-INTEGRATION-PRODUCTION-V1`
Status: `ROLLED_BACK_FAIL_CLOSED / PHYSICAL_ONE_ROW_E2E_NOT_RUN`

## Authorized package and exact result

The owner authorized one bounded package for Timeweb App `258691`: publish
exact commit `48b70d7966bd99105b698d37f5efc05962cd0949`, bind a temporary protected
`HH_CHAT_READBACK_TOKEN`, deploy that exact commit, obtain the newest immutable
HH run/snapshot binding, make exactly one owner-only metadata readback with
`max_read=1`, prove zero message/read/view effects, remove the token, and roll
back to `a35e1dee5bd4cc4453f7ffd3f25c670702ca9f15` on any mismatch.

The target deployment reached `success`, but its fresh HH runtime never reached
the required ready state during the bounded verification window. Repeated
health readbacks remained `connection=unknown`, `sync=never`,
`chat_links=not_run`, with no current run ID or snapshot hash. Because the
request could not be bound to a proven current immutable run, the protected
row request was not made. The temporary token was removed and the authorized
rollback was executed immediately.

## Git and deployment evidence

- Local integration commit: `48b70d7966bd99105b698d37f5efc05962cd0949`.
- Local integration tree: `18ee7fd22c75fac6ff6586953d4e98d41d1e0a42`.
- Parent/rollback commit: `a35e1dee5bd4cc4453f7ffd3f25c670702ca9f15`.
- Target remote ref was pushed and read back exactly at `48b70d7966bd99105b698d37f5efc05962cd0949` before deployment.
- Rollback ref was created first and read back exactly:
  `refs/heads/rollback/hh-owner-readback-before-48b70d7` ->
  `a35e1dee5bd4cc4453f7ffd3f25c670702ca9f15`.
- Target deployment ID: `2f197894-2c61-4c58-90b2-78dcc1695f0f`.
- Target deployment readback: `success`, exact deployed commit
  `48b70d7966bd99105b698d37f5efc05962cd0949`.
- Rollback deployment ID: `8e023d94-e490-4dea-87df-591d5dcebda8`.
- Rollback deployment readback: `success`, exact deployed commit
  `a35e1dee5bd4cc4453f7ffd3f25c670702ca9f15`.
- Final Timeweb App readback: `active`, branch
  `rollback/hh-owner-readback-before-48b70d7`, commit
  `a35e1dee5bd4cc4453f7ffd3f25c670702ca9f15`.

No secret value, protected alias, provider ID, PII, or message body was printed
or written to this handoff.

## One-readback accounting and zero-effect evidence

- Protected owner-readback request count: `0`.
- Retry count: `0`.
- Response count: `0`.
- Record opaque alias: `NOT_SELECTED_OR_EXPOSED`.
- HH `/messages`, `/messages/send`, status, viewed, or read-marker calls: `0`.
- Before target deployment: unread chats `73`, `messages_read=0`, `sends=0`.
- After rollback: unread chats `73`, `messages_read=0`, `sends=0`.
- After rollback health: HTTP `200`, `enabled=true`, `schema=ready`,
  `connection=active`, `sync=ready`, `last_error_code=null`, chats `ready`,
  chat-link status `partial`, and an immutable run/hash is present again.
- Candidate creation, outbound jobs and live activation requested by this
  package: `0`; the protected readback route is read-only and was never called.
- Viewed effect: `0`; no HH message endpoint was called.

## Credential removal and route closure

- Final authenticated Timeweb configuration readback contains no
  `HH_CHAT_READBACK_TOKEN` variable.
- The temporary token value was cleared from the browser automation memory
  after removal.
- Final unauthenticated owner-readback route probe returned HTTP `404`.
- Therefore the protected live route is fail-closed after rollback.

## Verification inherited by the deployed target

Before the live package, exact commit `48b70d7966bd99105b698d37f5efc05962cd0949`
was clean and passed:

- mandatory Karkasnik/context/contour-ledger gates;
- HH `48/48` tests, including the exact run/snapshot/alias/max-read contract;
- Batman `38/38` tests;
- `npm run check` and `npm run build`;
- `git diff --check` and conflict-marker scan.

The unchanged Tilda baseline remains `6/9`; three existing fixtures lack the
relay idempotency key. This package did not touch or deploy Tilda behavior.

## Rollback, blocked resource, and next external check

Rollback state: `EXECUTED_AND_VERIFIED`. The app is active on the authorized
parent SHA, the temporary credential is absent, the protected route returns
`404`, and the baseline HH health/counters are restored.

`blocked_resource`:

- physical one-row owner readback on the fail-closed target commit;
- a target deployment whose fresh HH runtime produces a current immutable
  run ID and snapshot hash before the bounded preview window closes.

`unblocked_work`:

- exact integration commit, remote target ref, rollback ref, target deployment
  evidence, fail-closed decision, credential removal, rollback deployment, and
  zero-effect post-rollback verification are complete.

`next_external_check`:

- diagnose why a fresh deployment of `48b70d7966bd99105b698d37f5efc05962cd0949`
  remains `connection=unknown / sync=never / chat_links=not_run` before any new
  credential or preview action;
- obtain a new exact owner action-time confirmation before another production
  deploy/credential/readback package, because the confirmed package ended in
  rollback.

Verdict: `SAFE_ROLLBACK_COMPLETE / READY_FOR_RUNTIME_STARTUP_DIAGNOSIS / NOT_READY_FOR_OWNER_TEST`.
