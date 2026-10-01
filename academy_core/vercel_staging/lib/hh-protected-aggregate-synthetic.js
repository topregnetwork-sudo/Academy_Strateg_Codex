'use strict';

// LOCAL SYNTHETIC CONTRACT ONLY. No I/O, provider client, store, or sender import.
const { createHash } = require('node:crypto');

const MANIFEST_SHA256 = 'b70dec6f1cfc5e0bd03656bdac162b61cbb14b3051d570c198432595378c6c48';
const MANIFEST_VERSION = '2.6';
const CODE_VERSION = 'hh-protected-aggregate-synthetic.v1';
const QUERY_VERSION = 'synthetic-joined-aggregate.v1';
const SCHEMA_VERSION = 'negotiation_primary_disposition.v1.1+person_primary_disposition.v1';
const NOT_MEASURED = 'NOT_MEASURED';
const SOURCE_NAMES = Object.freeze(['provider', 'identity', 'target', 'trainer', 'refusal', 'suppression', 'delivery', 'freshness', 'communication', 'exception']);
const FIELD_SETS = Object.freeze({
  provider: ['negotiationRef', 'vacancyRef', 'area', 'purpose', 'rowComplete'],
  identity: ['negotiationRef', 'outcome', 'personRef'],
  target: ['negotiationRef', 'binding', 'targetRef', 'personRef', 'purpose', 'campaignRef', 'routeRef', 'plausibleTargetCount'],
  trainer: ['personRef', 'targetRef', 'coverage', 'stage', 'existingTrainerRef', 'batmanPartner', 'activeIncompatible', 'handoffFailed', 'eligibleBase', 'nextStep'],
  refusal: ['personRef', 'targetRef', 'negotiationRef', 'kind', 'scope', 'valid'],
  suppression: ['personRef', 'targetRef', 'kind', 'scope', 'active'],
  delivery: ['personRef', 'targetRef', 'negotiationRef', 'kind', 'scope', 'providerProven'],
  freshness: ['negotiationRef', 'sourceAt', 'maxAgeSeconds', 'policyVersion'],
  communication: ['negotiationRef', 'coverage', 'state', 'windowClosed', 'delivered'],
  exception: ['personRef', 'targetRef', 'existingTrainerRef', 'state', 'decisionVersion', 'reason', 'approvedByRole', 'evidenceValid', 'approvedAt', 'validFrom', 'expiresAt', 'cityRef', 'vacancyRef']
});
const PERSON_CODES = Object.freeze([
  'SOURCE_EVIDENCE_INCOMPLETE', 'UNKNOWN_MANUAL_IDENTITY', 'REVIEW_BLOCKED_SCOPE',
  'REVIEW_BLOCKED_MIXED_NEGOTIATION_EVIDENCE', 'DNC_OPT_OUT_OR_WITHDRAWAL',
  'HH_REFUSAL', 'FUNNEL_REFUSAL_NOT_RELEVANT', 'BOT_BLOCKED',
  'ACTIVE_INCOMPATIBLE_JOURNEY', 'ALREADY_BATMAN_PARTNER', 'STALE_OR_INELIGIBLE',
  'HANDOFF_FAILED', 'NO_REPLY_AFTER_CONTACT', 'NEVER_REPLIED', 'ALREADY_TRAINER',
  'TRAINER_CONTINUATION_REVIEW', 'ELIGIBLE_REVIEW', 'REVIEW_BLOCKED'
]);
const NEG_CODES = Object.freeze([
  'SOURCE_ROW_INCOMPLETE', 'VACANCY_AREA_UNKNOWN', 'OUT_OF_SCOPE_AREA_OR_PURPOSE',
  'IDENTITY_CONFLICT', 'IDENTITY_AMBIGUOUS', 'IDENTITY_UNMATCHED',
  'TARGET_SCOPE_UNRESOLVED'
]);

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function sha256(value) { return createHash('sha256').update(value).digest('hex'); }
function hashRows(rows) {
  if (!Array.isArray(rows)) throw new Error('INVALID_SYNTHETIC_SOURCE');
  return sha256(canonical(rows.map(canonical).sort()));
}
function fail() { throw new Error('INVALID_SYNTHETIC_SOURCE'); }
function ref(value) { return typeof value === 'string' && /^syn-[a-z0-9-]+$/.test(value); }
function utc(value) { return typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value) && Number.isFinite(Date.parse(value)); }
function count(rows, predicate) { return rows.filter(predicate).length; }
function counts(codes) { return Object.fromEntries(codes.map(code => [code, 0])); }
function index(rows, key) {
  const map = new Map();
  for (const row of rows) {
    const id = row[key];
    if (!map.has(id)) map.set(id, []);
    map.get(id).push(row);
  }
  return map;
}
function one(indexed, id) {
  const rows = indexed.get(id) || [];
  if (rows.length === 0) return null;
  if (rows.every(row => canonical(row) === canonical(rows[0]))) return rows[0];
  return 'CONFLICT';
}
function complete(source, name) {
  if (!source || source.version !== `${name}.synthetic.v1` || source.authority !== 'SYNTHETIC_FIXTURE' ||
      !Array.isArray(source.rows) || !/^[a-f0-9]{64}$/.test(source.sha256 || '') ||
      source.sha256 !== hashRows(source.rows) || typeof source.complete !== 'boolean') fail();
  for (const row of source.rows) {
    if (!row || typeof row !== 'object' || Array.isArray(row) ||
        Object.keys(row).some(key => !FIELD_SETS[name].includes(key))) fail();
    for (const [key, value] of Object.entries(row)) {
      if (key.endsWith('Ref') && value !== null && !ref(value)) fail();
    }
    if (name === 'provider' && (!['CHELYABINSK_PROVEN', 'OTHER', 'UNKNOWN'].includes(row.area) ||
        !['trainer_recruitment', 'other', 'UNKNOWN'].includes(row.purpose) || typeof row.rowComplete !== 'boolean')) fail();
    if (name === 'identity' && (!ref(row.negotiationRef) || !['unique', 'missing', 'ambiguous', 'conflict'].includes(row.outcome) ||
        (row.outcome === 'unique' && !ref(row.personRef)))) fail();
    if (name === 'target' && (!ref(row.negotiationRef) || !['exact', 'unresolved'].includes(row.binding) ||
        (row.binding === 'exact' && (![row.targetRef, row.personRef, row.campaignRef, row.routeRef].every(ref) || row.purpose !== 'trainer_recruitment')) ||
        (row.plausibleTargetCount !== undefined && (!Number.isSafeInteger(row.plausibleTargetCount) || row.plausibleTargetCount < 0)))) fail();
    if (name === 'trainer' && (!ref(row.personRef) || !ref(row.targetRef) || !['COMPLETE', 'PARTIAL', 'UNKNOWN'].includes(row.coverage) ||
        !['NONE', 'ACTIVE', 'TERMINAL', 'UNKNOWN'].includes(row.stage) ||
        ['batmanPartner', 'activeIncompatible', 'handoffFailed', 'eligibleBase', 'nextStep'].some(key => typeof row[key] !== 'boolean'))) fail();
    if (name === 'refusal' && (!ref(row.personRef) || !['HH', 'FUNNEL'].includes(row.kind) ||
        !['NEGOTIATION', 'TARGET', 'UNKNOWN'].includes(row.scope) || typeof row.valid !== 'boolean' ||
        (row.scope === 'NEGOTIATION' && !ref(row.negotiationRef)) || (row.scope === 'TARGET' && !ref(row.targetRef)))) fail();
    if (name === 'suppression' && (!ref(row.personRef) || !['DNC', 'OPT_OUT', 'WITHDRAWAL', 'DELETION'].includes(row.kind) ||
        !['GLOBAL_PERSON', 'TARGET', 'UNKNOWN'].includes(row.scope) || typeof row.active !== 'boolean' ||
        (row.scope === 'TARGET' && !ref(row.targetRef)))) fail();
    if (name === 'delivery' && (!ref(row.personRef) || !['BOT_BLOCK', 'DELIVERY_FAILURE'].includes(row.kind) ||
        !['NEGOTIATION', 'TARGET', 'UNKNOWN'].includes(row.scope) || typeof row.providerProven !== 'boolean' ||
        (row.scope === 'NEGOTIATION' && !ref(row.negotiationRef)) || (row.scope === 'TARGET' && !ref(row.targetRef)))) fail();
    if (name === 'freshness' && (!ref(row.negotiationRef) || !utc(row.sourceAt) || !ref(row.policyVersion) ||
        !Number.isSafeInteger(row.maxAgeSeconds) || row.maxAgeSeconds < 0)) fail();
    if (name === 'communication' && (!ref(row.negotiationRef) || !['COMPLETE', 'PARTIAL', 'UNKNOWN'].includes(row.coverage) ||
        !['NONE', 'REPLIED', 'NO_REPLY_AFTER_CONTACT', 'NEVER_REPLIED', 'UNKNOWN'].includes(row.state) ||
        typeof row.windowClosed !== 'boolean' || typeof row.delivered !== 'boolean')) fail();
    if (name === 'exception' && (!ref(row.personRef) || !ref(row.targetRef) || !ref(row.existingTrainerRef) ||
        !['DRAFT', 'APPROVED', 'REVOKED', 'SUPERSEDED'].includes(row.state) ||
        !Number.isSafeInteger(row.decisionVersion) || row.decisionVersion < 1 ||
        !['RESUME_EXISTING_TRAINER_PROCESS', 'REOPEN_TERMINAL_TRAINER_PROCESS'].includes(row.reason) ||
        !['OWNER', 'OPERATOR'].includes(row.approvedByRole) || typeof row.evidenceValid !== 'boolean' ||
        !utc(row.approvedAt) || !utc(row.validFrom) || !utc(row.expiresAt) || !ref(row.cityRef) || !ref(row.vacancyRef))) fail();
  }
  return source.complete;
}
function noMeasured(run, sourceComplete) {
  return {
    status: sourceComplete ? 'JOIN_EVIDENCE_INCOMPLETE' : 'SOURCE_INCOMPLETE',
    denominators: { D_seen: NOT_MEASURED, D_qualifying: NOT_MEASURED, D_target_A_sum: NOT_MEASURED, D_person_A_sum: NOT_MEASURED, D_person_union: NOT_MEASURED },
    negotiation_dispositions: NOT_MEASURED, person_dispositions: NOT_MEASURED,
    plausible_target_diagnostic_non_additive: NOT_MEASURED,
    overlap_flags_non_additive: NOT_MEASURED,
    reconciliation: { negotiation: NOT_MEASURED, person: NOT_MEASURED },
    completeness: run
  };
}
function applicable(event, target, negotiationRefs) {
  if (event.scope === 'GLOBAL_PERSON') return true;
  if (event.scope === 'TARGET') return event.targetRef === target.targetRef;
  if (event.scope === 'NEGOTIATION') return negotiationRefs.has(event.negotiationRef);
  return false;
}
function exactException(rows, trainer, target, vacancyRefs, now) {
  if (!trainer.existingTrainerRef) return null;
  const matched = rows.filter(row => row.personRef === target.personRef && row.targetRef === target.targetRef && row.existingTrainerRef === trainer.existingTrainerRef);
  if (!matched.length) return null;
  if (matched.some(row => !Number.isSafeInteger(row.decisionVersion) || row.decisionVersion < 1)) return null;
  const versions = matched.map(row => row.decisionVersion).sort((a, b) => a - b);
  if (versions.some((version, index) => version !== index + 1)) return null;
  const latestVersion = Math.max(...matched.map(row => row.decisionVersion));
  const latestRows = matched.filter(row => row.decisionVersion === latestVersion);
  if (latestRows.length !== 1) return null;
  const row = latestRows[0];
  if (row.state !== 'APPROVED' || row.approvedByRole !== 'OWNER' || row.evidenceValid !== true ||
      !utc(row.approvedAt) || !utc(row.validFrom) || !utc(row.expiresAt) ||
      !(Date.parse(row.validFrom) <= Date.parse(row.approvedAt) && Date.parse(row.approvedAt) < Date.parse(row.expiresAt)) ||
      !(Date.parse(row.validFrom) <= now && now < Date.parse(row.expiresAt)) ||
      row.cityRef !== 'syn-chelyabinsk' || ![...vacancyRefs].every(vacancyRef => vacancyRef === row.vacancyRef)) return null;
  if (row.reason === 'RESUME_EXISTING_TRAINER_PROCESS' && trainer.stage === 'ACTIVE' && trainer.nextStep === true) return 'RESUME';
  if (row.reason === 'REOPEN_TERMINAL_TRAINER_PROCESS' && trainer.stage === 'TERMINAL') return 'REOPEN';
  return null;
}
function personDisposition(group, sources, indexes, exactTargetsByPerson, now) {
  const { target, negotiations } = group;
  const trainer = one(indexes.trainer, `${target.personRef}|${target.targetRef}`);
  const negotiationRefs = new Set(negotiations.map(row => row.negotiationRef));
  const vacancyRefs = new Set(negotiations.map(row => row.vacancyRef));
  if (!trainer || trainer === 'CONFLICT' || trainer.coverage !== 'COMPLETE' || !['NONE', 'ACTIVE', 'TERMINAL'].includes(trainer.stage)) return { primary: 'SOURCE_EVIDENCE_INCOMPLETE', flags: [] };
  if ((trainer.stage === 'NONE') !== !trainer.existingTrainerRef) return { primary: 'SOURCE_EVIDENCE_INCOMPLETE', flags: [] };
  const freshness = negotiations.map(row => one(indexes.freshness, row.negotiationRef));
  const communication = negotiations.map(row => one(indexes.communication, row.negotiationRef));
  if ([...freshness, ...communication].some(row => !row || row === 'CONFLICT') ||
      communication.some(row => row.coverage !== 'COMPLETE' || !['NONE', 'REPLIED', 'NO_REPLY_AFTER_CONTACT', 'NEVER_REPLIED'].includes(row.state)) ||
      freshness.some(row => Date.parse(row.sourceAt) > now) ||
      communication.some(row => row.state === 'NO_REPLY_AFTER_CONTACT' && !(row.delivered === true && row.windowClosed === true))) {
    return { primary: 'SOURCE_EVIDENCE_INCOMPLETE', flags: [] };
  }
  const allEvents = [...sources.refusal.rows, ...sources.suppression.rows, ...sources.delivery.rows].filter(row => row.personRef === target.personRef);
  if (allEvents.some(row => row.scope === 'UNKNOWN' &&
      (row.targetRef === target.targetRef || negotiationRefs.has(row.negotiationRef) ||
       (!row.targetRef && !row.negotiationRef && exactTargetsByPerson.get(target.personRef)?.size === 1)))) {
    return { primary: 'REVIEW_BLOCKED_SCOPE', flags: [] };
  }
  if (allEvents.some(row => applicable(row, target, negotiationRefs) &&
      ((Object.hasOwn(row, 'valid') && row.valid === false) || (row.kind === 'BOT_BLOCK' && row.providerProven === false)))) {
    return { primary: 'SOURCE_EVIDENCE_INCOMPLETE', flags: [] };
  }
  const refusals = sources.refusal.rows.filter(row => row.personRef === target.personRef && applicable(row, target, negotiationRefs) && row.valid === true);
  const stops = sources.suppression.rows.filter(row => row.personRef === target.personRef && row.active === true && applicable(row, target, negotiationRefs));
  const delivery = sources.delivery.rows.filter(row => row.personRef === target.personRef && applicable(row, target, negotiationRefs));
  const flags = [];
  if (stops.some(row => ['DNC', 'OPT_OUT', 'WITHDRAWAL', 'DELETION'].includes(row.kind))) flags.push('DNC_OPT_OUT_OR_WITHDRAWAL');
  if (refusals.some(row => row.kind === 'HH')) flags.push('HH_REFUSAL');
  if (refusals.some(row => row.kind === 'FUNNEL')) flags.push('FUNNEL_REFUSAL_NOT_RELEVANT');
  if (delivery.some(row => row.kind === 'BOT_BLOCK' && row.providerProven === true)) flags.push('BOT_BLOCKED');
  if (trainer.activeIncompatible === true) flags.push('ACTIVE_INCOMPATIBLE_JOURNEY');
  if (trainer.batmanPartner === true) flags.push('ALREADY_BATMAN_PARTNER');
  if (freshness.some(row => now - Date.parse(row.sourceAt) > row.maxAgeSeconds * 1000)) flags.push('STALE_OR_INELIGIBLE');
  if (trainer.handoffFailed === true) flags.push('HANDOFF_FAILED');
  if (communication.some(row => row.state === 'NO_REPLY_AFTER_CONTACT' && row.delivered === true && row.windowClosed === true)) flags.push('NO_REPLY_AFTER_CONTACT');
  if (communication.some(row => row.state === 'NEVER_REPLIED')) flags.push('NEVER_REPLIED');
  if (trainer.existingTrainerRef) flags.push('ALREADY_TRAINER');
  const negotiationLocalRefusal = refusals.some(row => row.scope === 'NEGOTIATION' && row.kind === 'HH');
  if (negotiationLocalRefusal && negotiations.length > 1 && refusals.some(row => row.scope === 'NEGOTIATION') &&
      negotiations.some(row => !refusals.some(event => event.scope === 'NEGOTIATION' && event.negotiationRef === row.negotiationRef)) &&
      flags.every(flag => flag === 'HH_REFUSAL' || flag === 'ALREADY_TRAINER')) {
    return { primary: 'REVIEW_BLOCKED_MIXED_NEGOTIATION_EVIDENCE', flags };
  }
  for (const code of PERSON_CODES.slice(4, 14)) if (flags.includes(code)) return { primary: code, flags };
  if (trainer.existingTrainerRef) {
    const exception = exactException(sources.exception.rows, trainer, target, vacancyRefs, now);
    if (exception === 'RESUME') return { primary: 'TRAINER_CONTINUATION_REVIEW', flags };
    if (exception !== 'REOPEN') return { primary: 'ALREADY_TRAINER', flags };
  }
  if (trainer.eligibleBase === true) return { primary: 'ELIGIBLE_REVIEW', flags };
  return { primary: 'REVIEW_BLOCKED', flags };
}

function evaluateProtectedAggregate(input) {
  if (!input || input.mode !== 'SYNTHETIC_ONLY' || input.manifest?.version !== MANIFEST_VERSION ||
      input.manifest?.sha256?.toLowerCase() !== MANIFEST_SHA256 || !input.sources ||
      !ref(input.runId) || !utc(input.observedAt)) fail();
  const sourceComplete = {};
  for (const name of SOURCE_NAMES) sourceComplete[name] = complete(input.sources[name], name);
  const providerProof = input.sources.provider.coverage;
  if (!providerProof || Object.keys(providerProof).sort().join('|') !== 'authorizedScope|foundMatchesRows|stableDiscovery|terminalPages' ||
      Object.values(providerProof).some(value => typeof value !== 'boolean')) fail();
  const sourceReady = sourceComplete.provider && Object.values(providerProof).every(Boolean);
  const unboundedTarget = input.sources.target.rows.some(row => row.binding === 'unresolved' && !Number.isSafeInteger(row.plausibleTargetCount));
  let joinReady = sourceReady && SOURCE_NAMES.every(name => sourceComplete[name]) && !unboundedTarget;
  const provenance = {
    run_id: input.runId, snapshot_hash: sha256(canonical({ manifest: MANIFEST_SHA256, observedAt: input.observedAt, sources: SOURCE_NAMES.map(name => [name, input.sources[name].version, input.sources[name].sha256, sourceComplete[name]]), coverage: providerProof })),
    observed_at: input.observedAt, code_version: CODE_VERSION, query_version: QUERY_VERSION,
    schema_version: SCHEMA_VERSION, manifest_version: MANIFEST_VERSION, manifest_sha256: MANIFEST_SHA256,
    source_versions: Object.fromEntries(SOURCE_NAMES.map(name => [name, input.sources[name].version])),
    source_hashes: Object.fromEntries(SOURCE_NAMES.map(name => [name, input.sources[name].sha256]))
  };
  const effects = {
    scope: 'LOCAL_SYNTHETIC_NO_IO', source_reads: 0, source_writes: 0,
    person_reads: 0, person_writes: 0, candidate_reads: 0, candidate_writes: 0,
    card_writes: 0, journey_writes: 0, status_writes: 0,
    message_reads: 0, message_writes: 0, sends: 0, webhook_writes: 0,
    outbox_writes: 0, domain_writes: 0
  };
  const privacy = { pii_fields_emitted: 0, row_identifiers_emitted: 0, candidate_rows_emitted: 0 };
  // A contains person_ref. Per-A values must be produced later by a protected query,
  // not released as person-keyed or singleton buckets from this local envelope.
  const perTargetLimitation = {
    mode: 'CROSS_TARGET_SUMS_ONLY', D_target_A: 'NOT_EMITTED',
    D_person_A: 'NOT_EMITTED', protected_query_required: true
  };
  const base = {
    ...provenance, effects, privacy, per_target_reconciliation: perTargetLimitation,
    implementation_ready_for_review: false, audience_ready: false,
    ready_for_owner_test: false, outbound: 'DISABLED',
    candidate_selection: false, candidate_selected: false
  };
  const sourceRows = new Map();
  let duplicateConflict = false;
  for (const row of input.sources.provider.rows) {
    if (!ref(row.negotiationRef) || !ref(row.vacancyRef)) fail();
    if (!sourceRows.has(row.negotiationRef)) sourceRows.set(row.negotiationRef, row);
    else if (canonical(sourceRows.get(row.negotiationRef)) !== canonical(row)) duplicateConflict = true;
  }
  if (duplicateConflict) return { ...base, ...noMeasured({ ...sourceComplete, provider: false }, false) };
  if (!sourceReady) return { ...base, ...noMeasured(sourceComplete, false) };
  const rows = [...sourceRows.values()].sort((a, b) => a.negotiationRef.localeCompare(b.negotiationRef));
  const D_seen = rows.length;
  const D_qualifying = count(rows, row => row.area === 'CHELYABINSK_PROVEN' && row.purpose === 'trainer_recruitment');
  const identityIndex = index(input.sources.identity.rows, 'negotiationRef');
  const targetIndex = index(input.sources.target.rows, 'negotiationRef');
  const exactTargetsByPerson = new Map();
  for (const row of rows) {
    if (row.rowComplete !== true || row.area !== 'CHELYABINSK_PROVEN' || row.purpose !== 'trainer_recruitment') continue;
    const identity = one(identityIndex, row.negotiationRef);
    const target = one(targetIndex, row.negotiationRef);
    if (identity?.outcome !== 'unique' || target?.binding !== 'exact' || target.personRef !== identity.personRef ||
        !ref(target.targetRef) || !ref(target.campaignRef) || !ref(target.routeRef)) continue;
    if (!exactTargetsByPerson.has(identity.personRef)) exactTargetsByPerson.set(identity.personRef, new Set());
    exactTargetsByPerson.get(identity.personRef).add(canonical([
      target.personRef, target.targetRef, target.purpose, target.campaignRef, target.routeRef
    ]));
  }
  // An unscoped person event can block a single exact A; with several exact As
  // its affected A is unknown, so joined official measures remain unmeasured.
  const unboundedUnknownScope = ['refusal', 'suppression', 'delivery'].some(name =>
    input.sources[name].rows.some(event => event.scope === 'UNKNOWN' && !event.targetRef && !event.negotiationRef &&
      (exactTargetsByPerson.get(event.personRef)?.size || 0) > 1));
  const targetRefs = new Set(input.sources.target.rows.map(row => row.negotiationRef));
  const missingTargetLookup = rows.some(row => row.area === 'CHELYABINSK_PROVEN' && row.purpose === 'trainer_recruitment' &&
    input.sources.identity.rows.some(link => link.negotiationRef === row.negotiationRef && link.outcome === 'unique') && !targetRefs.has(row.negotiationRef));
  joinReady = joinReady && !missingTargetLookup && !unboundedUnknownScope;
  if (!joinReady) {
    const result = noMeasured({ ...sourceComplete, scope_bounded: !unboundedUnknownScope && !unboundedTarget && !missingTargetLookup }, true);
    result.denominators.D_seen = D_seen;
    result.denominators.D_qualifying = D_qualifying;
    return { ...base, ...result };
  }
  const indexes = {
    identity: identityIndex,
    target: targetIndex,
    freshness: index(input.sources.freshness.rows, 'negotiationRef'),
    communication: index(input.sources.communication.rows, 'negotiationRef'),
    trainer: index(input.sources.trainer.rows, 'personRef')
  };
  indexes.trainer = index(input.sources.trainer.rows.map(row => ({ ...row, personTarget: `${row.personRef}|${row.targetRef}` })), 'personTarget');
  const neg = counts(NEG_CODES);
  const plausible = {
    finite_unresolved_negotiations: 0, plausible_target_memberships: 0,
    coverage: 'COMPLETE_FINITE', additive_denominator: false
  };
  const groups = new Map();
  const linked = [];
  for (const row of rows) {
    let primary;
    if (row.rowComplete !== true) primary = 'SOURCE_ROW_INCOMPLETE';
    else if (row.area === 'UNKNOWN') primary = 'VACANCY_AREA_UNKNOWN';
    else if (row.area !== 'CHELYABINSK_PROVEN' || row.purpose !== 'trainer_recruitment') primary = 'OUT_OF_SCOPE_AREA_OR_PURPOSE';
    else {
      const identity = one(indexes.identity, row.negotiationRef);
      if (identity === 'CONFLICT' || identity?.outcome === 'conflict') primary = 'IDENTITY_CONFLICT';
      else if (identity?.outcome === 'ambiguous') primary = 'IDENTITY_AMBIGUOUS';
      else if (!identity || identity.outcome === 'missing') primary = 'IDENTITY_UNMATCHED';
      else if (identity.outcome !== 'unique' || !ref(identity.personRef)) primary = 'IDENTITY_CONFLICT';
      else {
        const target = one(indexes.target, row.negotiationRef);
        if (!target || target === 'CONFLICT' || target.binding !== 'exact' ||
            target.personRef !== identity.personRef || !ref(target.targetRef) ||
            target.purpose !== 'trainer_recruitment' || !ref(target.campaignRef) || !ref(target.routeRef)) {
          primary = 'TARGET_SCOPE_UNRESOLVED';
        } else {
          const key = `${target.personRef}|${target.targetRef}`;
          if (!groups.has(key)) groups.set(key, { target, negotiations: [] });
          const group = groups.get(key);
          const sameA = ['targetRef', 'personRef', 'purpose', 'campaignRef', 'routeRef']
            .every(field => group.target[field] === target[field]);
          if (!sameA) primary = 'TARGET_SCOPE_UNRESOLVED';
          else { group.negotiations.push(row); linked.push({ row, key }); }
        }
      }
    }
    if (primary) neg[primary]++;
    if (primary === 'TARGET_SCOPE_UNRESOLVED') {
      const target = one(indexes.target, row.negotiationRef);
      if (target && target !== 'CONFLICT' && target.binding === 'unresolved' &&
          Number.isSafeInteger(target.plausibleTargetCount)) {
        plausible.finite_unresolved_negotiations++;
        plausible.plausible_target_memberships += target.plausibleTargetCount;
        if (!Number.isSafeInteger(plausible.plausible_target_memberships)) fail();
      } else plausible.coverage = 'PARTIAL';
    }
  }
  if (plausible.coverage === 'PARTIAL') {
    const result = noMeasured({ ...sourceComplete, scope_bounded: false }, true);
    result.denominators.D_seen = D_seen;
    result.denominators.D_qualifying = D_qualifying;
    return { ...base, ...result };
  }
  const person = counts(PERSON_CODES);
  const overlap = counts(PERSON_CODES.slice(4, 15));
  const outcomes = new Map();
  const now = Date.parse(input.observedAt);
  for (const [key, group] of groups) {
    const result = personDisposition(group, input.sources, indexes, exactTargetsByPerson, now);
    outcomes.set(key, result.primary);
    person[result.primary]++;
    for (const flag of result.flags) if (Object.hasOwn(overlap, flag)) overlap[flag]++;
  }
  for (const { key } of linked) {
    const code = `LINKED_PERSON_FOR_TARGET:${outcomes.get(key)}`;
    neg[code] = (neg[code] || 0) + 1;
  }
  const negotiationSum = Object.values(neg).reduce((sum, value) => sum + value, 0);
  const personSum = Object.values(person).reduce((sum, value) => sum + value, 0);
  const personUnion = new Set([...groups.values()].map(group => group.target.personRef)).size;
  const reconciled = negotiationSum === D_seen && personSum === groups.size && linked.length === [...groups.values()].reduce((sum, group) => sum + group.negotiations.length, 0);
  if (!reconciled) return { ...base, ...noMeasured(sourceComplete, true), status: 'RECONCILIATION_FAILED' };
  return {
    ...base, status: 'SYNTHETIC_AGGREGATE_RECONCILED', completeness: sourceComplete,
    implementation_ready_for_review: neg.SOURCE_ROW_INCOMPLETE === 0 &&
      person.SOURCE_EVIDENCE_INCOMPLETE === 0 && person.REVIEW_BLOCKED_SCOPE === 0 &&
      plausible.coverage === 'COMPLETE_FINITE',
    denominators: { D_seen, D_qualifying, D_target_A_sum: linked.length, D_person_A_sum: groups.size, D_person_union: personUnion },
    negotiation_dispositions: neg, person_dispositions: person,
    plausible_target_diagnostic_non_additive: plausible, overlap_flags_non_additive: overlap,
    reconciliation: { negotiation: true, person: true, target_binding: true,
      D_seen_disposition_sum: negotiationSum, D_target_A_sum_linked: linked.length,
      D_person_A_sum_bucket_sum: personSum }
  };
}

module.exports = { evaluateProtectedAggregate, hashRows, MANIFEST_SHA256, NOT_MEASURED };
