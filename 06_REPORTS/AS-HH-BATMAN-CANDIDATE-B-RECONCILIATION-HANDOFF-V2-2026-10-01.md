# HH Candidate B + Batman reconciliation handoff V2 — vacancy lifecycle V11

Date: 2026-10-01

Change ID: `AS-HH-VACANCY-LIFECYCLE-V11-20261001`

Branch: `codex/hh-batman-reconcile`

Baseline: `d1ca11dfdffc0c1ddc07ec1161a489b25386efa2`

Status: `PASS_LOCAL_INTEGRATION / READY_FOR_CODE_ACCEPTANCE / NOT_DEPLOYED / NOT_PHYSICAL_E2E`

## Exact controlled source

The versioned code registry `hh-vacancy-lifecycle.v11` binds vacancy `136453079` to exactly:

```text
source_mode=HISTORICAL_REACTIVATION
vacancy_lifecycle=ARCHIVED
archived_since=2026-09-19
active_acquisition_entry=false
active_for_live=false
```

The registry contains no generalized ID rule. Unregistered vacancies retain the accepted Candidate B behavior and remain subject to their existing provider, employer, city, identity, and live gates.

## Preserved and blocked behavior

Preserved historical read path:

- vacancy discovery and provider metadata GET;
- archived negotiation collection pagination and detail GET;
- historical `hh_vacancies`, `hh_negotiations`, checkpoint and membership storage;
- read-only chat inventory/linkage for the exact Chelyabinsk anchor.

Fail-closed active-acquisition surfaces for `136453079`:

- webhook admission rejects the vacancy before `webhookEvent` or sync dispatch;
- `inScopeVacancy` returns false without a database query;
- new historical negotiations create no `hh_domain_events` active route;
- no `hh_telegram_outbox` job is created;
- direct `bridgeJob` creation throws `HH_ACTIVE_ACQUISITION_SOURCE_BLOCKED`;
- no candidate or Batman activation write exists on this path.

The lifecycle metadata is authoritative in the exact code registry and is also passed in the `saveVacancy` record boundary. No database schema migration is required for the gate and none was executed.

## Final file hashes

| File | SHA-256 |
|---|---|
| `academy_core/vercel_staging/lib/hh-vacancy-registry.js` | `6127DF0ADA3E67B515EA82E914D3B341A6C48549E749ED7A07C3EF434695016A` |
| `academy_core/vercel_staging/lib/hh-chat-link.js` | `4A48578042485E6B11E104701C70B3394EADB89F3BE4007FA2F2CDF778F863BB` |
| `academy_core/vercel_staging/lib/hh-runtime.js` | `E1B59ED1B388D2AF45AA00D91C2FBDFFF88175412F8EC2F31F7308C324FF97CB` |
| `academy_core/vercel_staging/lib/hh-store.js` | `0A8283E4931765A6744D17307AA4574CE67FEFD67162FFCC602A524A0F3565C0` |
| `academy_core/vercel_staging/lib/hh-sync.js` | `EE6D118D5C86C29FB778CB4FD4828EEB454659CE4B846FB7BD946911334413F8` |
| `academy_core/vercel_staging/lib/hh-telegram-bridge.js` | `3BC6B4B74E0B2F57663C8D867B93FAEA2DFB8D8E4D20891754EBC7EAF61BB14D` |
| `academy_core/vercel_staging/package.json` | `0A7B3049E780D4E697F7359F01FA2BF0987F4581136276A2DE4C7A0E7B4EEEF2` |
| `academy_core/vercel_staging/tests/hh-production.test.js` | `18ED1C969971D9A9542378D30D966685451BF2789AD0FE5D667C6B65FA2D7ABD` |

## Verification

| Check | Result |
|---|---|
| Karkasnik/context/ledger preflight and postflight | `PASS / PASS / PASS` on both canonical-root runs |
| `npm run check` | `PASS` |
| `npm run build` | `PASS` |
| HH suite including lifecycle negative test | `47/47 PASS` |
| Batman regression suite | `38/38 PASS` |
| exact runtime ID location | only `lib/hh-vacancy-registry.js` |
| negative SQL-effect counters | route `0`, candidate `0`, outbound `0`, live activation `0` |
| historical archived sync | `1` page and `1` negotiation stored; messages read `0` |
| conflict markers | `0` |
| worktree `node_modules` | `ABSENT` |

The HH and Batman suites used the already existing dependency runtime through read-only `NODE_PATH`; no dependency directory was copied or created.

## Known inherited gap and live boundary

The V1 handoff recorded the unchanged Tilda baseline fixture gap: `6/9 PASS`, with three fixtures omitting the relay `idempotency_key` already required by Candidate B. This V11 lifecycle delta does not change Tilda files or expand that scope.

No HH/Telegram/Yandex connected call, migration, Preview deploy, production deploy, webhook cutover, message send, candidate creation, outbound delivery, or live activation was performed.

## Rollback

Revert only the V11 lifecycle commit recorded in the parent handoff:

```text
git revert <v11-lifecycle-commit>
```

This restores the accepted V1 integration commit without any live rollback because no live resource changed.
