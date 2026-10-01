'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { evaluateProtectedAggregate: evaluate, hashRows, MANIFEST_SHA256, NOT_MEASURED } = require('../lib/hh-protected-aggregate-synthetic');

const NOW = '2026-10-01T01:00:00Z';
const sourceNames = ['provider', 'identity', 'target', 'trainer', 'refusal', 'suppression', 'delivery', 'freshness', 'communication', 'exception'];
function wrap(name, rows, complete = true) {
  return { version: `${name}.synthetic.v1`, authority: 'SYNTHETIC_FIXTURE', rows, complete, sha256: hashRows(rows) };
}
function fixture() {
  const data = {
    provider: [
      { negotiationRef: 'syn-n1', vacancyRef: 'syn-chelyabinsk-vacancy', area: 'CHELYABINSK_PROVEN', purpose: 'trainer_recruitment', rowComplete: true },
      { negotiationRef: 'syn-n2', vacancyRef: 'syn-chelyabinsk-vacancy', area: 'CHELYABINSK_PROVEN', purpose: 'trainer_recruitment', rowComplete: true },
      { negotiationRef: 'syn-n3', vacancyRef: 'syn-other-vacancy', area: 'OTHER', purpose: 'trainer_recruitment', rowComplete: true }
    ],
    identity: [
      { negotiationRef: 'syn-n1', outcome: 'unique', personRef: 'syn-p1' },
      { negotiationRef: 'syn-n2', outcome: 'unique', personRef: 'syn-p1' }
    ],
    target: [
      { negotiationRef: 'syn-n1', binding: 'exact', targetRef: 'syn-t1', personRef: 'syn-p1', purpose: 'trainer_recruitment', campaignRef: 'syn-c1', routeRef: 'syn-r1' },
      { negotiationRef: 'syn-n2', binding: 'exact', targetRef: 'syn-t1', personRef: 'syn-p1', purpose: 'trainer_recruitment', campaignRef: 'syn-c1', routeRef: 'syn-r1' }
    ],
    trainer: [{ personRef: 'syn-p1', targetRef: 'syn-t1', coverage: 'COMPLETE', stage: 'NONE', batmanPartner: false, activeIncompatible: false, handoffFailed: false, eligibleBase: true, nextStep: false }],
    refusal: [], suppression: [], delivery: [],
    freshness: ['syn-n1', 'syn-n2'].map(negotiationRef => ({ negotiationRef, sourceAt: '2026-10-01T00:00:00Z', maxAgeSeconds: 86400, policyVersion: 'syn-policy-v1' })),
    communication: ['syn-n1', 'syn-n2'].map(negotiationRef => ({ negotiationRef, coverage: 'COMPLETE', state: 'NONE', windowClosed: false, delivered: false })),
    exception: []
  };
  return pack(data);
}
function pack(data, partial = {}) {
  const sources = Object.fromEntries(sourceNames.map(name => [name, wrap(name, data[name], partial[name] !== false)]));
  sources.provider.coverage = { authorizedScope: true, foundMatchesRows: true, stableDiscovery: true, terminalPages: true };
  return { mode: 'SYNTHETIC_ONLY', manifest: { version: '2.6', sha256: MANIFEST_SHA256 }, runId: 'syn-run-1', observedAt: NOW, sources };
}
function modify(input, name, mutate) {
  const rows = structuredClone(input.sources[name].rows);
  mutate(rows);
  input.sources[name] = wrap(name, rows);
  if (name === 'provider') input.sources.provider.coverage = { authorizedScope: true, foundMatchesRows: true, stableDiscovery: true, terminalPages: true };
  return input;
}
function primary(result) {
  return Object.entries(result.person_dispositions).filter(([, n]) => n > 0).map(([code]) => code);
}
function exception(input, patch = {}) {
  modify(input, 'trainer', rows => Object.assign(rows[0], { stage: 'ACTIVE', existingTrainerRef: 'syn-trainer-1', nextStep: true }));
  modify(input, 'exception', rows => rows.push({
    personRef: 'syn-p1', targetRef: 'syn-t1', existingTrainerRef: 'syn-trainer-1', state: 'APPROVED', decisionVersion: 1,
    reason: 'RESUME_EXISTING_TRAINER_PROCESS', approvedByRole: 'OWNER', evidenceValid: true,
    approvedAt: '2026-10-01T00:00:00Z', validFrom: '2026-10-01T00:00:00Z', expiresAt: '2026-10-02T00:00:00Z',
    cityRef: 'syn-chelyabinsk', vacancyRef: 'syn-chelyabinsk-vacancy', ...patch
  }));
  return input;
}

test('complete source and exact person×target algebra; no IDs or rows escape', () => {
  const result = evaluate(fixture());
  assert.equal(result.status, 'SYNTHETIC_AGGREGATE_RECONCILED');
  assert.deepEqual(result.denominators, { D_seen: 3, D_qualifying: 2, D_target_A_sum: 2, D_person_A_sum: 1, D_person_union: 1 });
  assert.equal(result.negotiation_dispositions['LINKED_PERSON_FOR_TARGET:ELIGIBLE_REVIEW'], 2);
  assert.equal(result.negotiation_dispositions.OUT_OF_SCOPE_AREA_OR_PURPOSE, 1);
  assert.equal(result.person_dispositions.ELIGIBLE_REVIEW, 1);
  assert.deepEqual(result.reconciliation, { negotiation: true, person: true, target_binding: true,
    D_seen_disposition_sum: 3, D_target_A_sum_linked: 2, D_person_A_sum_bucket_sum: 1 });
  assert.equal(result.audience_ready, false);
  assert.equal(result.implementation_ready_for_review, true);
  assert.equal(result.ready_for_owner_test, false);
  assert.equal(result.outbound, 'DISABLED');
  assert.equal(result.candidate_selection, false);
  assert.equal(result.candidate_selected, false);
  assert.deepEqual(result.privacy, { pii_fields_emitted: 0, row_identifiers_emitted: 0, candidate_rows_emitted: 0 });
  assert.deepEqual(result.per_target_reconciliation, {
    mode: 'CROSS_TARGET_SUMS_ONLY', D_target_A: 'NOT_EMITTED',
    D_person_A: 'NOT_EMITTED', protected_query_required: true
  });
  for (const key of ['source_reads', 'source_writes', 'person_reads', 'person_writes',
    'candidate_reads', 'candidate_writes', 'card_writes', 'journey_writes',
    'status_writes', 'message_reads', 'message_writes', 'sends', 'webhook_writes',
    'outbox_writes', 'domain_writes']) assert.equal(result.effects[key], 0);
  assert.ok(Object.entries(result.effects).every(([key, value]) => key === 'scope' || value === 0));
  const serial = JSON.stringify(result);
  for (const id of ['syn-n1', 'syn-n2', 'syn-n3', 'syn-p1', 'syn-t1', 'syn-c1', 'syn-r1']) assert.ok(!serial.includes(id));
});

test('manifest and every source hash/version are mandatory; extra PII fields rejected', () => {
  const wrongManifest = fixture(); wrongManifest.manifest.sha256 = '0'.repeat(64);
  assert.throws(() => evaluate(wrongManifest), /INVALID_SYNTHETIC_SOURCE/);
  const wrongHash = fixture(); wrongHash.sources.identity.sha256 = '0'.repeat(64);
  assert.throws(() => evaluate(wrongHash), /INVALID_SYNTHETIC_SOURCE/);
  const wrongVersion = fixture(); wrongVersion.sources.target.version = 'target.v0';
  assert.throws(() => evaluate(wrongVersion), /INVALID_SYNTHETIC_SOURCE/);
  const pii = fixture(); pii.sources.provider.rows[0].email = 'someone@example.invalid'; pii.sources.provider.sha256 = hashRows(pii.sources.provider.rows);
  assert.throws(() => evaluate(pii), /INVALID_SYNTHETIC_SOURCE/);
  const realId = fixture(); realId.sources.provider.rows[0].negotiationRef = '123456'; realId.sources.provider.sha256 = hashRows(realId.sources.provider.rows);
  assert.throws(() => evaluate(realId), /INVALID_SYNTHETIC_SOURCE/);
});

test('permutation and identical duplicates do not change snapshot or counts', () => {
  const a = fixture();
  const b = fixture();
  for (const name of sourceNames) modify(b, name, rows => rows.reverse());
  assert.deepEqual(evaluate(a), evaluate(b));
  const d = fixture(); modify(d, 'provider', rows => rows.push(structuredClone(rows[0])));
  assert.equal(evaluate(d).denominators.D_seen, 3);
  assert.equal(evaluate(d).denominators.D_qualifying, 2);
});

test('incomplete provider or conflicting duplicate fails all denominators closed', () => {
  const partial = fixture(); partial.sources.provider.complete = false;
  const partialResult = evaluate(partial);
  assert.equal(partialResult.denominators.D_seen, NOT_MEASURED);
  assert.equal(partialResult.implementation_ready_for_review, false);
  assert.equal(partialResult.ready_for_owner_test, false);
  assert.equal(partialResult.candidate_selection, false);
  assert.deepEqual(partialResult.privacy, { pii_fields_emitted: 0, row_identifiers_emitted: 0, candidate_rows_emitted: 0 });
  const pageGap = fixture(); pageGap.sources.provider.coverage.terminalPages = false;
  assert.equal(evaluate(pageGap).denominators.D_qualifying, NOT_MEASURED);
  const conflict = fixture(); modify(conflict, 'provider', rows => rows.push({ ...rows[0], vacancyRef: 'syn-other-vacancy' }));
  const conflictResult = evaluate(conflict);
  assert.equal(conflictResult.denominators.D_seen, NOT_MEASURED);
  assert.equal(conflictResult.implementation_ready_for_review, false);
  assert.equal(conflictResult.outbound, 'DISABLED');
});

test('incomplete joined source keeps only source denominator numeric', () => {
  const input = fixture(); input.sources.suppression.complete = false;
  const result = evaluate(input);
  assert.equal(result.denominators.D_seen, 3);
  assert.equal(result.denominators.D_qualifying, 2);
  assert.equal(result.denominators.D_person_A_sum, NOT_MEASURED);
  assert.equal(result.person_dispositions, NOT_MEASURED);
  assert.equal(result.implementation_ready_for_review, false);
  assert.equal(result.ready_for_owner_test, false);
  assert.equal(result.candidate_selection, false);
});

test('V4 regression: one incomplete communication row in same person×target blocks eligibility', () => {
  const input = fixture();
  modify(input, 'communication', rows => { rows[1].coverage = 'PARTIAL'; });
  const result = evaluate(input);
  assert.equal(result.denominators.D_qualifying, 2);
  assert.equal(result.denominators.D_person_A_sum, 1);
  assert.equal(result.person_dispositions.SOURCE_EVIDENCE_INCOMPLETE, 1);
  assert.equal(result.person_dispositions.ELIGIBLE_REVIEW, 0);
  assert.equal(result.negotiation_dispositions['LINKED_PERSON_FOR_TARGET:SOURCE_EVIDENCE_INCOMPLETE'], 2);
  assert.equal(result.implementation_ready_for_review, false);
  assert.equal(result.audience_ready, false);
  assert.equal(result.ready_for_owner_test, false);
  assert.equal(result.candidate_selection, false);
  assert.equal(result.outbound, 'DISABLED');
  assert.deepEqual(result.privacy, { pii_fields_emitted: 0, row_identifiers_emitted: 0, candidate_rows_emitted: 0 });
});

test('identity unique/missing/ambiguous/conflict and target unresolved are exclusive', () => {
  const input = fixture();
  modify(input, 'identity', rows => { rows[0].outcome = 'ambiguous'; delete rows[0].personRef; rows[1].outcome = 'missing'; delete rows[1].personRef; });
  let result = evaluate(input);
  assert.equal(result.negotiation_dispositions.IDENTITY_AMBIGUOUS, 1);
  assert.equal(result.negotiation_dispositions.IDENTITY_UNMATCHED, 1);
  assert.equal(result.denominators.D_person_A_sum, 0);
  modify(input, 'identity', rows => { rows[0].outcome = 'conflict'; });
  result = evaluate(input);
  assert.equal(result.negotiation_dispositions.IDENTITY_CONFLICT, 1);
  const targetGap = fixture(); modify(targetGap, 'target', rows => { rows[0].binding = 'unresolved'; delete rows[0].targetRef; rows[0].plausibleTargetCount = 2; });
  result = evaluate(targetGap);
  assert.equal(result.negotiation_dispositions.TARGET_SCOPE_UNRESOLVED, 1);
  assert.equal(result.denominators.D_qualifying, 2);
  assert.equal(result.denominators.D_target_A_sum, 1);
});

test('source-row, unknown-area and non-Trainer classifications follow source precedence', () => {
  const input = fixture();
  modify(input, 'provider', rows => {
    rows[0].rowComplete = false;
    rows[1].area = 'UNKNOWN';
    rows[2].purpose = 'other';
  });
  const result = evaluate(input);
  assert.equal(result.negotiation_dispositions.SOURCE_ROW_INCOMPLETE, 1);
  assert.equal(result.negotiation_dispositions.VACANCY_AREA_UNKNOWN, 1);
  assert.equal(result.negotiation_dispositions.OUT_OF_SCOPE_AREA_OR_PURPOSE, 1);
  assert.equal(result.reconciliation.D_seen_disposition_sum, result.denominators.D_seen);
});

test('same person in two exact targets is not summed as two distinct people', () => {
  const input = fixture();
  modify(input, 'target', rows => Object.assign(rows[1], { targetRef: 'syn-t2', campaignRef: 'syn-c2', routeRef: 'syn-r2' }));
  modify(input, 'trainer', rows => rows.push({ ...rows[0], targetRef: 'syn-t2' }));
  const result = evaluate(input);
  assert.equal(result.denominators.D_target_A_sum, 2);
  assert.equal(result.denominators.D_person_A_sum, 2);
  assert.equal(result.denominators.D_person_union, 1);
});

test('target-scoped stop does not spill into a second exact target of one person', () => {
  const input = fixture();
  modify(input, 'target', rows => Object.assign(rows[1], { targetRef: 'syn-t2', campaignRef: 'syn-c2', routeRef: 'syn-r2' }));
  modify(input, 'trainer', rows => rows.push({ ...rows[0], targetRef: 'syn-t2' }));
  modify(input, 'suppression', rows => rows.push({ personRef: 'syn-p1', targetRef: 'syn-t1', kind: 'OPT_OUT', scope: 'TARGET', active: true }));
  const result = evaluate(input);
  assert.equal(result.person_dispositions.DNC_OPT_OUT_OR_WITHDRAWAL, 1);
  assert.equal(result.person_dispositions.ELIGIBLE_REVIEW, 1);
  assert.equal(result.denominators.D_person_union, 1);
});

test('stop precedence and non-additive overlaps; delivery failure is not bot block', () => {
  const input = fixture();
  modify(input, 'refusal', rows => rows.push({ personRef: 'syn-p1', targetRef: 'syn-t1', kind: 'HH', scope: 'TARGET', valid: true }));
  modify(input, 'suppression', rows => rows.push({ personRef: 'syn-p1', targetRef: 'syn-t1', kind: 'DNC', scope: 'TARGET', active: true }));
  modify(input, 'delivery', rows => rows.push({ personRef: 'syn-p1', targetRef: 'syn-t1', kind: 'BOT_BLOCK', scope: 'TARGET', providerProven: true }));
  const result = evaluate(input);
  assert.deepEqual(primary(result), ['DNC_OPT_OUT_OR_WITHDRAWAL']);
  for (const code of ['DNC_OPT_OUT_OR_WITHDRAWAL', 'HH_REFUSAL', 'BOT_BLOCKED']) assert.equal(result.overlap_flags_non_additive[code], 1);
  const failure = fixture();
  modify(failure, 'delivery', rows => rows.push({ personRef: 'syn-p1', targetRef: 'syn-t1', kind: 'DELIVERY_FAILURE', scope: 'TARGET', providerProven: false }));
  assert.equal(evaluate(failure).person_dispositions.BOT_BLOCKED, 0);
});

test('negotiation-local refusal mixed with another clean negotiation blocks same target only', () => {
  const input = fixture();
  modify(input, 'refusal', rows => rows.push({ personRef: 'syn-p1', targetRef: 'syn-t1', negotiationRef: 'syn-n1', kind: 'HH', scope: 'NEGOTIATION', valid: true }));
  assert.deepEqual(primary(evaluate(input)), ['REVIEW_BLOCKED_MIXED_NEGOTIATION_EVIDENCE']);
  modify(input, 'target', rows => Object.assign(rows[1], { targetRef: 'syn-t2', campaignRef: 'syn-c2', routeRef: 'syn-r2' }));
  modify(input, 'trainer', rows => rows.push({ ...rows[0], targetRef: 'syn-t2' }));
  const result = evaluate(input);
  assert.equal(result.person_dispositions.HH_REFUSAL, 1);
  assert.equal(result.person_dispositions.ELIGIBLE_REVIEW, 1);
});

test('unknown event scope and missing evidence block, while stale/no-reply are distinct', () => {
  const scope = fixture(); modify(scope, 'suppression', rows => rows.push({ personRef: 'syn-p1', targetRef: 'syn-t1', kind: 'OPT_OUT', scope: 'UNKNOWN', active: true }));
  assert.deepEqual(primary(evaluate(scope)), ['REVIEW_BLOCKED_SCOPE']);
  const missing = fixture(); modify(missing, 'communication', rows => rows.pop());
  assert.deepEqual(primary(evaluate(missing)), ['SOURCE_EVIDENCE_INCOMPLETE']);
  const stale = fixture(); modify(stale, 'freshness', rows => { rows[0].maxAgeSeconds = 1; });
  assert.deepEqual(primary(evaluate(stale)), ['STALE_OR_INELIGIBLE']);
  const noReply = fixture(); modify(noReply, 'communication', rows => Object.assign(rows[0], { state: 'NO_REPLY_AFTER_CONTACT', delivered: true, windowClosed: true }));
  assert.deepEqual(primary(evaluate(noReply)), ['NO_REPLY_AFTER_CONTACT']);
  const never = fixture(); modify(never, 'communication', rows => { rows[0].state = 'NEVER_REPLIED'; });
  assert.deepEqual(primary(evaluate(never)), ['NEVER_REPLIED']);
  const future = fixture(); modify(future, 'freshness', rows => { rows[0].sourceAt = '2026-10-02T00:00:00Z'; });
  assert.deepEqual(primary(evaluate(future)), ['SOURCE_EVIDENCE_INCOMPLETE']);
  const unprovenSilence = fixture(); modify(unprovenSilence, 'communication', rows => { rows[0].state = 'NO_REPLY_AFTER_CONTACT'; });
  assert.deepEqual(primary(evaluate(unprovenSilence)), ['SOURCE_EVIDENCE_INCOMPLETE']);
});

test('unbounded unknown event/target scope keeps downstream official counts NOT_MEASURED', () => {
  const event = fixture(); modify(event, 'suppression', rows => rows.push({ personRef: 'syn-p1', kind: 'DNC', scope: 'UNKNOWN', active: true }));
  let result = evaluate(event);
  assert.equal(result.denominators.D_seen, 3);
  assert.equal(result.denominators.D_person_A_sum, NOT_MEASURED);
  assert.equal(result.completeness.scope_bounded, false);
  const target = fixture(); modify(target, 'target', rows => { rows[0].binding = 'unresolved'; delete rows[0].targetRef; });
  result = evaluate(target);
  assert.equal(result.denominators.D_qualifying, 2);
  assert.equal(result.denominators.D_target_A_sum, NOT_MEASURED);
  const missing = fixture(); modify(missing, 'target', rows => rows.pop());
  assert.equal(evaluate(missing).denominators.D_person_A_sum, NOT_MEASURED);
});

test('all absolute stop families remain separate from reuse and contact permission', () => {
  const families = [
    ['suppression', { personRef: 'syn-p1', targetRef: 'syn-t1', kind: 'OPT_OUT', scope: 'TARGET', active: true }, 'DNC_OPT_OUT_OR_WITHDRAWAL'],
    ['suppression', { personRef: 'syn-p1', kind: 'DELETION', scope: 'GLOBAL_PERSON', active: true }, 'DNC_OPT_OUT_OR_WITHDRAWAL'],
    ['refusal', { personRef: 'syn-p1', targetRef: 'syn-t1', kind: 'FUNNEL', scope: 'TARGET', valid: true }, 'FUNNEL_REFUSAL_NOT_RELEVANT'],
    ['delivery', { personRef: 'syn-p1', targetRef: 'syn-t1', kind: 'BOT_BLOCK', scope: 'TARGET', providerProven: true }, 'BOT_BLOCKED']
  ];
  for (const [source, event, expected] of families) {
    const input = exception(fixture()); modify(input, source, rows => rows.push(event));
    const result = evaluate(input);
    assert.deepEqual(primary(result), [expected]);
    assert.equal(result.outbound, 'DISABLED');
  }
});

test('invalid evidence is never read as proof of no stop', () => {
  const refusal = fixture(); modify(refusal, 'refusal', rows => rows.push({ personRef: 'syn-p1', targetRef: 'syn-t1', kind: 'HH', scope: 'TARGET', valid: false }));
  assert.deepEqual(primary(evaluate(refusal)), ['SOURCE_EVIDENCE_INCOMPLETE']);
  const block = fixture(); modify(block, 'delivery', rows => rows.push({ personRef: 'syn-p1', targetRef: 'syn-t1', kind: 'BOT_BLOCK', scope: 'TARGET', providerProven: false }));
  assert.deepEqual(primary(evaluate(block)), ['SOURCE_EVIDENCE_INCOMPLETE']);
  const unknownEnum = fixture(); modify(unknownEnum, 'suppression', rows => rows.push({ personRef: 'syn-p1', targetRef: 'syn-t1', kind: 'NEW_STOP', scope: 'TARGET', active: true }));
  assert.throws(() => evaluate(unknownEnum), /INVALID_SYNTHETIC_SOURCE/);
});

test('reuse exception is exact, finite, owner-approved and cannot remove stops', () => {
  assert.deepEqual(primary(evaluate(exception(fixture()))), ['TRAINER_CONTINUATION_REVIEW']);
  assert.deepEqual(primary(evaluate(exception(fixture(), { expiresAt: NOW }))), ['ALREADY_TRAINER']);
  assert.deepEqual(primary(evaluate(exception(fixture(), { approvedByRole: 'OPERATOR' }))), ['ALREADY_TRAINER']);
  assert.deepEqual(primary(evaluate(exception(fixture(), { vacancyRef: 'syn-other-vacancy' }))), ['ALREADY_TRAINER']);
  const revoked = exception(fixture()); modify(revoked, 'exception', rows => rows.push({ ...rows[0], decisionVersion: 2, state: 'REVOKED' }));
  assert.deepEqual(primary(evaluate(revoked)), ['ALREADY_TRAINER']);
  const tie = exception(fixture()); modify(tie, 'exception', rows => rows.push({ ...rows[0], reason: 'REOPEN_TERMINAL_TRAINER_PROCESS' }));
  assert.deepEqual(primary(evaluate(tie)), ['ALREADY_TRAINER']);
  const gap = exception(fixture()); modify(gap, 'exception', rows => rows[0].decisionVersion = 2);
  assert.deepEqual(primary(evaluate(gap)), ['ALREADY_TRAINER']);
  const reopened = exception(fixture(), { reason: 'REOPEN_TERMINAL_TRAINER_PROCESS' });
  modify(reopened, 'trainer', rows => { rows[0].stage = 'TERMINAL'; rows[0].nextStep = false; });
  assert.deepEqual(primary(evaluate(reopened)), ['ELIGIBLE_REVIEW']);
  const stopped = exception(fixture()); modify(stopped, 'suppression', rows => rows.push({ personRef: 'syn-p1', targetRef: 'syn-t1', kind: 'WITHDRAWAL', scope: 'TARGET', active: true }));
  assert.deepEqual(primary(evaluate(stopped)), ['DNC_OPT_OUT_OR_WITHDRAWAL']);
  const mixedSource = exception(fixture()); modify(mixedSource, 'provider', rows => { rows[1].vacancyRef = 'syn-second-chelyabinsk-vacancy'; });
  assert.deepEqual(primary(evaluate(mixedSource)), ['ALREADY_TRAINER']);
});

test('pure module has no connected, read-message or write dependencies', () => {
  const code = readFileSync(join(__dirname, '../lib/hh-protected-aggregate-synthetic.js'), 'utf8');
  assert.deepEqual([...code.matchAll(/require\(['"]([^'"]+)['"]\)/g)].map(match => match[1]), ['node:crypto']);
  assert.ok(!/\b(fetch|axios|Pool|sendMessage|markViewed|updateStatus|subscribeWebhook)\s*\(/.test(code));
});
