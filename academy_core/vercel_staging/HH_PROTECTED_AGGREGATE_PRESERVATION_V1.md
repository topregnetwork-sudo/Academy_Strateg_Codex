# HH protected Trainer aggregate — preservation contract v1

Change ID: `HH-TRAINER-PROTECTED-AGGREGATE-V1`.
Production baseline: `3bfc454abb258a1e4e2a614a64035c5a1fc4bbab` in Timeweb App `258691`.
Rollback target: `codex/rollback-hh-protected-aggregate-before-v1` at that exact commit.
Earlier known-good fallback: `b179318a5a482489d063c6cc31cab038dfd6b7b4`.
Accepted specification: V2.6 manifest SHA-256
`B70DEC6F1CFC5E0BD03656BDAC162B61CBB14B3051D570C198432595378C6C48`.

## Requested delta (Acceptance 90 V3, local-only)

Add a pure, locally callable, **synthetic-only** V2.6 protected aggregate
adapter. Its inputs are exact-manifest and per-source version/hash-bound;
it checks source, identity, exact target, Trainer status, refusal, stop,
delivery, freshness, communication and reuse-exception evidence; emits only
cohort-level counts, reconciliation, completeness and zero-effect synthetic
metadata. Unknown or incomplete authoritative inputs fail closed to
`NOT_MEASURED`. No connected reads, endpoint, database migration, production
deployment, candidate rows, PII or outbound feature is included.

## Adjacent behavior preserved

- Existing HH OAuth, vacancy replay, chat-link inventory, participant scan
  limit, public health and disabled owner-readback behavior do not change.
- No `/common/chats/{id}/messages`, send, status change, webhook subscription,
  Telegram, candidate/card/journey/outbox writer or new eligibility route.
- Existing credentials, flags and Timeweb settings stay unchanged.
- Both prior production rollback refs remain available.

## Acceptance and rollback

Local synthetic tests must prove exact manifest/source hashes, duplicate
deduplication and conflict handling, incomplete-run fail-closed, target scope,
person/negotiation algebra, precedence, exception boundaries, permutation
invariance, no input refs/PII in output, and zero connected/write methods.
Existing targeted HH tests, syntax and diff checks must pass. This change
does **not** claim live runtime E2E, owner-test readiness or send authority.
For the local code change, revert its commit only; production remains at the
baseline and requires no rollback. The dedicated rollback branch already
points at the baseline locally; remote publication was not completed and is
not a prerequisite for this no-deploy change.
