# HH chat metadata linkage — preservation contract v1

- Change ID: `HH-CHAT-LINK-V1`.
- Production baseline and exact rollback target: `b179318a5a482489d063c6cc31cab038dfd6b7b4`.
- Rollback ref: `codex/rollback-hh-chat-link-before-v1`.
- Scope: the already approved HH employer runtime in Timeweb App 258691 and its protected PostgreSQL schema, limited to the two authorized vacancy anchors `136453079` and `136455388`.
- New behavior: bounded `/common/chats` metadata inventory of both anchors; at most 100 `/participants` reads per cycle, prioritizing unread chats and leaving every unscanned identity explicitly unknown; protected chat-to-resume-to-negotiation-to-vacancy linkage; immutable run ID/hash and timestamp; aggregate-only health and protected per-chat operator readback with opaque aliases.
- Preserved behavior: OAuth manager/employer verification, two-vacancy negotiation synchronization, checkpoint replay, Telegram isolation, existing Batman/Trainer routes and data, `HH_WEBHOOK_ENABLED=false`, no candidate send, status action, or message-body GET.
- Acceptance: tests exclude message endpoints and raw content; no provider IDs or PII in responses/logs; ambiguous and unscanned identities remain unknown; exact replay creates no duplicate chat identities or domain events; production deploy plus external readback and rollback ref are verified separately. A partial run cannot be described as full audience reconciliation.
- Rollback: redeploy the baseline ref, leave additive metadata tables untouched for recoverability, disable any new readback route before exposing it if protection fails; never roll back candidate messages because none are permitted in this change.
