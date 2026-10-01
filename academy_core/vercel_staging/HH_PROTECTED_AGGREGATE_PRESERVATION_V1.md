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

## Acceptance 90 V4 pre-integration delta

Change ID: `HH-TRAINER-PROTECTED-AGGREGATE-V1-PREINTEGRATION`.
Canonical local base: `76b242bdb531427bfd38a5be4cd14795e5f10d88`.
Acceptance V4 SHA-256:
`D7285F56F26FFB83BB97E1607A36632778F14340EFD61B173375F14DF5B3CA46`.
Only add explicit release/privacy/zero-effect fields, a same-person×target
multi-negotiation incomplete-communication regression, and a documented
per-target-output limitation. Preserve the pure synthetic-only, no-IO and
fail-closed semantics, existing HH runtime, and all prior tests. No merge,
push, connected read or deployment. A failed local delta is recoverable by
reverting only its new commit; production remains unchanged.

## Trainer 30 V2.6 semantic precision delta

Change ID: `HH-TRAINER-PROTECTED-AGGREGATE-V1-V26-PRECISION`.
Local baseline: `21e3f132e75177748575c013c791785034172933`.
Trainer review SHA-256:
`EB759A576E97A8FA0CDBC300DC651EAF712115E48AF98E72B3200028CE5E05EF`.
Add only a non-additive, reference-free finite plausible-target diagnostic and
the V2.6 UNKNOWN event-scope person×exact-A blocked roll-up. Never add
plausible memberships to `D_target_A_sum`/`D_person_A_sum`, never emit target
IDs, and keep multiple possible exact-A associations fail-closed. Preserve
V4 release/privacy/zero-effect fields and the partial-communication regression.
Rollback this delta's own local commit only; no production change is planned.
