# HH Candidate B + Batman RUN-01 reconciliation handoff V1

Date: 2026-10-01

Change ID: `AS-HH-BATMAN-CANDIDATE-B-RECONCILE-20261001-V1`

Branch: `codex/hh-batman-reconcile`

Baseline: `f610572feb64e929f8033d26f3cb06a22c3fd982`

Status: `PASS_LOCAL_INTEGRATION / NOT_DEPLOYED / NOT_PHYSICAL_E2E`

## Scope and preservation verdict

The six-file Batman patch was reconciled over the accepted HH Candidate B baseline without dropping either side:

- `telegram-bot.js` retains HH relay URL/signature, idempotency enforcement and forum-topic support, while adding Batman private-chat diagnostics and bounded Telegram error classification;
- `yandex-disk.js` retains HH list/upload/publish transfer operations and adds Batman permanent-delete plus missing-resource readback;
- `package.json` retains HH and Tilda scripts and combines the complete local Batman syntax/test inventory;
- the three non-conflicting Batman files remain applied;
- the minimal Batman RUN-01 dependency closure was added because the original six-file patch referenced files absent from the HH branch;
- RUN-01 and synthetic Batman callers now forward the existing outbox idempotency key to the accepted HH relay contract.

No production, deploy, webhook, credential, connected service, message send, database migration, or real-data action was performed. No `node_modules` directory was created in the integration worktree.

## Final file hashes

SHA-256 hashes below identify the exact committed integration inputs before the handoff report itself is committed.

| File | SHA-256 |
|---|---|
| `academy_core/vercel_staging/.env.example` | `B6BF020A9BFDB6F6DD64C0021C3660CECABBCB5CA0A4A3343C7257A91C5C76AA` |
| `academy_core/vercel_staging/lib/batman-runtime-config.js` | `75308EFCE9E2BE89C407E1D77E8A65F50A594A6C30B9E77F669D5E92CEC020BE` |
| `academy_core/vercel_staging/lib/telegram-bot.js` | `16B826B2D5011FCFFAF0252DE626FB6AB1C9D27607826DAE0CAFAEE464A943BD` |
| `academy_core/vercel_staging/lib/yandex-disk.js` | `C1E87EC6ED56437C8A440BDF3153896D257D46A7806D7C66371F45872423006F` |
| `academy_core/vercel_staging/package.json` | `F0F55FA0DF38D1AFEC30C7C489549F1483CE72CF7AB5FA3B330EEAE3649FB60B` |
| `academy_core/vercel_staging/tests/batman-storage-worker.test.js` | `E81FE9A2B2463D32173697A6480CC51F4930768282DE90688E05FAAC8519BC6F` |
| `academy_core/vercel_staging/tests/batman-telegram-synthetic.test.js` | `536B09D139FAE8F9F8FCB509ABD561B04F4A3D70244D27A7ACC51EE8A1A30BC1` |
| `academy_core/vercel_staging/api/telegram/batman.js` | `6DEDD6C6BDB67020405FBE85F0E9AAD8CADA271DAF9F6FCECA901652DEF47D74` |
| `academy_core/vercel_staging/lib/batman-entry-reuse.js` | `A4D403072C2A5BCC4A601CACBDAF37712F57B61ACDBC40E01130CCE9A7858E8D` |
| `academy_core/vercel_staging/lib/batman-privacy-erasure.js` | `D62BED3764CDB7A16DD50B6ECBDBB99D6BBC1646A759A51B7559DFBAE203BEE9` |
| `academy_core/vercel_staging/lib/batman-route-contract.js` | `90625A66018E1DE345824D141DD61C4B8E7145025E27EA72BB66BBD509958DDC` |
| `academy_core/vercel_staging/lib/batman-run01.js` | `120CACE0A618C36B9B8A9C7B7A27902A4F88B0B7C1E8281EADDA4551DBC1477D` |
| `academy_core/vercel_staging/migrations/0009_batman_privacy_erasure.sql` | `EA5AAC177C3EDEA0965A32EFF3D2CB2F605E3E85958D4D6D395558D9B39E8468` |
| `academy_core/vercel_staging/tests/batman-entry-reuse.test.js` | `8B356E6B0561952F24A68006906D3C4BEA1499E25BFFA334DE225A60DB6D9A9F` |
| `academy_core/vercel_staging/tests/batman-privacy-erasure.test.js` | `3E9F59734D938AA1250FEC68528457ECC5CA8ABB10A6525FB9F9EC61CABE868F` |
| `academy_core/vercel_staging/tests/batman-route-contract.test.js` | `1A79135FFE0C8D11E0CCBED1697CFCCE4B891D8A5E47E17B982D9A6CCBAB4327` |
| `academy_core/vercel_staging/tests/batman-run01.test.js` | `1E6A54F50E24562C60DFA5182488B2D266CF3660E1D31E52A105721212649997` |

## Verification evidence

| Check | Result |
|---|---|
| mandatory Karkasnik/context/ledger gates before and after work | `PASS / PASS / PASS`, exit `0` on both canonical-root runs |
| conflict markers | `0` |
| package JSON parse | `PASS` |
| `npm run check` | `PASS` |
| `npm run build` | `PASS` |
| HH suite | `46/46 PASS` |
| Batman suite, including entry reuse, privacy erasure, route contract and RUN-01 | `38/38 PASS` |
| `git diff --check` | required again immediately before commit |
| worktree `node_modules` | `ABSENT` |

The HH and Batman runtime suites used a read-only `NODE_PATH` pointing to the already existing dependency runtime in the shared checkout; no dependency files were copied into this worktree.

## Known gaps and non-blocking evidence

1. `npm run test:tilda` produced `6/9 PASS`. The three failures are an existing Candidate B fixture mismatch: unchanged Tilda test doubles omit `idempotency_key`, while the accepted HH `telegram-bot.js` baseline already defaults to the relay and requires that key. `lib/tilda-telegram-outbox.js` and both Tilda test files have zero diff from baseline. This integration does not change Tilda runtime behavior.
2. Migration `0009_batman_privacy_erasure.sql` was not applied to any database.
3. No external Telegram/Yandex/HH call, Preview deploy, production deploy, webhook cutover, or physical E2E was performed. Those remain action-time gated.

## Rollback

Revert the single reconciliation commit recorded in the parent handoff. This removes the exact integration and dependency closure without changing the accepted baseline commit or any live resource:

```text
git revert <reconciliation-commit>
```

No live rollback is required because no live resource changed.
