const { sha256 } = require('./hh-security')
const { bridgeJob } = require('./hh-telegram-bridge')
const { activeAcquisitionAllowed } = require('./hh-vacancy-registry')

function hhStore(pool) {
  async function consumeSession(stateHash, browserHash) {
    const { rows } = await pool.query(`
      update hh_oauth_sessions set used_at=now()
      where state_hash=$1 and browser_hash=$2 and used_at is null
        and expires_at >= now() and issued_at <= now()
      returning verifier_box, issued_at, expires_at, used_at
    `, [stateHash, browserHash])
    return rows[0] || null
  }

  async function saveToken({ applicationId, accessBox, refreshBox, expiresAt }) {
    await pool.query(`
      insert into hh_connections(id,host,application_id,status,access_box,refresh_box,expires_at,token_version)
      values ('hh-ru-employer','hh.ru',$1,'pending_review',$2,$3,$4,1)
      on conflict(id) do update set application_id=excluded.application_id,
        status='pending_review',access_box=excluded.access_box,refresh_box=excluded.refresh_box,
        expires_at=excluded.expires_at,token_version=hh_connections.token_version+1,updated_at=now()
    `, [applicationId, accessBox, refreshBox, expiresAt])
  }

  async function verifyManager({ managerId, managerName, employerId, employerName, expectedEmployerId }) {
    if (!managerId || !employerId || employerId !== expectedEmployerId) {
      await pool.query("update hh_connections set status='conflict',last_error_code='IDENTITY_MISMATCH',updated_at=now() where id='hh-ru-employer'")
      return false
    }
    await pool.query(`update hh_connections set manager_id=$1,manager_name=$2,employer_id=$3,
      employer_name=$4,status='active',last_error_code=null,updated_at=now() where id='hh-ru-employer'`,
    [managerId, managerName, employerId, employerName])
    return true
  }

  async function connection() {
    const { rows } = await pool.query("select * from hh_connections where id='hh-ru-employer'")
    return rows[0] || null
  }

  async function auditCounts() {
    const { rows } = await pool.query(`select
      (select count(*) from hh_negotiations where host='hh.ru' and employer_id='1702778') as negotiations,
      (select count(*) from hh_domain_events where host='hh.ru' and employer_id='1702778') as events,
      (select count(*) from hh_telegram_outbox o join hh_domain_events e on e.id=o.event_id
        where e.host='hh.ru' and e.employer_id='1702778') as outbox`)
    const row = rows[0] || {}
    const counts = { negotiations: Number(row.negotiations), events: Number(row.events), outbox: Number(row.outbox) }
    if (!Object.values(counts).every(value => Number.isSafeInteger(value) && value >= 0)) {
      throw new Error('HH_DB_AUDIT_INVALID')
    }
    return counts
  }

  async function findNegotiationsByResume(vacancyId, resumeId) {
    if (!/^\d+$/.test(String(vacancyId)) || !resumeId || String(resumeId).length > 200) {
      throw new Error('HH_CHAT_LINK_LOOKUP_INVALID')
    }
    const { rows } = await pool.query(`select negotiation_id, person_id, identity_status,
      applicant_state, employer_state from hh_negotiations
      where host='hh.ru' and employer_id='1702778' and vacancy_id=$1 and resume_id=$2
      order by negotiation_id limit 2`, [vacancyId, resumeId])
    return rows
  }

  async function saveChatLinkRun(run) {
    const client = await pool.connect()
    try {
      await client.query('begin')
      await client.query(`insert into hh_chat_link_runs(run_id,snapshot_hash,observed_at,counts)
        values($1,$2,$3,$4::jsonb)`, [run.runId, run.snapshotHash, run.observedAt,
        JSON.stringify(run.counts)])
      for (const row of run.rows) {
        await client.query(`insert into hh_chat_links
          (chat_alias,chat_id_box,vacancy_id,vacancy_bucket,resume_key,negotiation_id,
           link_status,identity_linked,hh_state_known,unread_count,last_message_marker,
           participant_viewed_markers,run_id,observed_at)
          values($1,$2::jsonb,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14)
          on conflict(chat_alias) do update set chat_id_box=excluded.chat_id_box,
            vacancy_id=excluded.vacancy_id,vacancy_bucket=excluded.vacancy_bucket,
            resume_key=excluded.resume_key,negotiation_id=excluded.negotiation_id,
            link_status=excluded.link_status,identity_linked=excluded.identity_linked,
            hh_state_known=excluded.hh_state_known,unread_count=excluded.unread_count,
            last_message_marker=excluded.last_message_marker,
            participant_viewed_markers=excluded.participant_viewed_markers,
            run_id=excluded.run_id,observed_at=excluded.observed_at`,
        [row.chatAlias, JSON.stringify(row.chatIdBox), row.vacancyId, row.vacancyBucket,
          row.resumeKey, row.negotiationId, row.linkStatus, row.identityLinked,
          row.hhStateKnown, row.unreadCount, row.lastMessageMarker,
          JSON.stringify(row.participantViewedMarkers), run.runId, run.observedAt])
      }
      await client.query('commit')
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally { client.release() }
  }

  async function chatLinkReadback({ bucket = 'CHELYABINSK_PROVEN', page = 0 } = {}) {
    if (!['CHELYABINSK_PROVEN', 'OTHER', 'UNKNOWN'].includes(bucket) ||
        !Number.isSafeInteger(page) || page < 0 || page > 1000) throw new Error('HH_CHAT_LINK_READBACK_SCOPE_INVALID')
    const current = await pool.query(`select run_id,snapshot_hash,observed_at,counts
      from hh_chat_link_runs order by created_at desc,run_id desc limit 1`)
    const run = current.rows[0]
    if (!run) return null
    const links = await pool.query(`select chat_alias,vacancy_bucket,unread_count,
      last_message_marker,participant_viewed_markers,link_status,identity_linked
      from hh_chat_links where run_id=$1 and vacancy_bucket=$2
      order by chat_alias limit 20 offset $3`, [run.run_id, bucket, page * 20])
    return { run, rows: links.rows }
  }

  async function updateTokens({ accessBox, refreshBox, expiresAt, expectedVersion }) {
    const result = await pool.query(`update hh_connections set access_box=$1,refresh_box=$2,expires_at=$3,
      token_version=token_version+1,updated_at=now() where id='hh-ru-employer' and token_version=$4
      and status='active'`, [accessBox, refreshBox, expiresAt, expectedVersion])
    return result.rowCount === 1
  }

  async function recoveryRequired(code) {
    await pool.query("update hh_connections set status='recovery_required',last_error_code=$1,updated_at=now() where id='hh-ru-employer'", [code])
  }

  async function saveSubscription({ subscriptionId, receiverHash }) {
    await pool.query(`update hh_connections set webhook_subscription_id=$1,webhook_receiver_hash=$2,
      updated_at=now() where id='hh-ru-employer' and status='active'`, [subscriptionId, receiverHash])
  }

  async function saveVacancy({ employerId, vacancyId, name, archived, publishedAt, snapshotHash,
    classification = 'UNKNOWN', areaId = null, areaName = null }) {
    await pool.query(`insert into hh_vacancies(host,employer_id,vacancy_id,name,archived,published_at,
      snapshot_hash,city_classification,area_id,area_name)
      values('hh.ru',$1,$2,$3,$4,$5,$6,$7,$8,$9) on conflict(host,employer_id,vacancy_id)
      do update set name=excluded.name,archived=excluded.archived,published_at=excluded.published_at,
        snapshot_hash=excluded.snapshot_hash,city_classification=excluded.city_classification,
        area_id=excluded.area_id,area_name=excluded.area_name,last_seen_at=now()`,
    [employerId, vacancyId, name, archived, publishedAt, snapshotHash, classification, areaId, areaName])
  }

  async function inScopeVacancy(vacancyId) {
    if (!/^\d+$/.test(vacancyId)) return false
    if (!activeAcquisitionAllowed(vacancyId)) return false
    const { rows } = await pool.query(`select 1 from hh_vacancies where host='hh.ru'
      and employer_id='1702778' and vacancy_id=$1
      and (vacancy_id='136455388' or city_classification='CHELYABINSK_PROVEN') limit 1`, [vacancyId])
    return rows.length === 1
  }

  async function savePage({ employerId, vacancyId, collectionId, page, collectionHash, pageHash, found, pages, items }) {
    const client = await pool.connect()
    try {
      await client.query('begin')
      const checkpoint = await client.query(`insert into hh_sync_checkpoints
        (host,employer_id,vacancy_id,collection_id,page,collection_snapshot_hash,page_hash,found,pages,raw_rows)
        values('hh.ru',$1,$2,$3,$4,$5,$6,$7,$8,$9)
        on conflict do nothing returning page`,
      [employerId, vacancyId, collectionId, page, collectionHash, pageHash, found, pages, items.length])
      if (checkpoint.rowCount === 0) {
        const previous = await client.query(`select page_hash from hh_sync_checkpoints where
          host='hh.ru' and employer_id=$1 and vacancy_id=$2 and collection_id=$3 and page=$4
          and collection_snapshot_hash=$5 for update`,
        [employerId, vacancyId, collectionId, page, collectionHash])
        if (previous.rows[0]?.page_hash === pageHash) {
          await client.query('commit')
          return { replay: true, inserted: 0 }
        }
        await client.query(`update hh_sync_checkpoints set page_hash=$6,found=$7,pages=$8,
          raw_rows=$9,committed_at=now() where host='hh.ru' and employer_id=$1 and vacancy_id=$2
          and collection_id=$3 and page=$4 and collection_snapshot_hash=$5`,
        [employerId, vacancyId, collectionId, page, collectionHash, pageHash, found, pages, items.length])
      }
      let inserted = 0
      for (const item of items) {
        const id = String(item.id || '')
        if (!id) throw new Error('HH_NEGOTIATION_ID_MISSING')
        const result = await client.query(`insert into hh_negotiations
          (host,employer_id,negotiation_id,vacancy_id,resume_id,applicant_state,employer_state,
          provider_created_at,provider_updated_at,detail_status,metadata_hash)
          values('hh.ru',$1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
          on conflict(host,employer_id,negotiation_id) do update set
            applicant_state=excluded.applicant_state,employer_state=excluded.employer_state,
            provider_updated_at=excluded.provider_updated_at,detail_status=excluded.detail_status,
            metadata_hash=excluded.metadata_hash,last_seen_at=now()
          returning (xmax = 0) as inserted`,
        [employerId, id, vacancyId, item.resume?.id || null, item.state?.id || null,
          item.employer_state?.id || null, item.created_at || null, item.updated_at || null,
          item.__detail_status || 'not_read',
          sha256(JSON.stringify({ id, state: item.state?.id, employer_state: item.employer_state?.id, updated_at: item.updated_at }))])
        if (result.rows[0]?.inserted) {
          inserted++
          if (activeAcquisitionAllowed(vacancyId)) {
            const job = bridgeJob({ employerId, vacancyId, negotiationId: id })
            const event = await client.query(`insert into hh_domain_events
              (host,employer_id,vacancy_id,negotiation_id,event_kind,idempotency_key)
              values('hh.ru',$1,$2,$3,'hh_negotiation_observed',$4)
              on conflict(idempotency_key) do nothing returning id`,
            [employerId, vacancyId, id, job.idempotencyKey])
            if (event.rows[0]) {
              await client.query(`insert into hh_telegram_outbox
                (event_id,event_kind,correlation_id,idempotency_key,delivery_state)
                values($1,$2,$3,$4,$5)
                on conflict(idempotency_key) do nothing`,
              [event.rows[0].id, job.eventKind, job.correlationId, job.idempotencyKey, job.deliveryState])
            }
          }
        }
        await client.query(`insert into hh_collection_memberships
          (host,employer_id,vacancy_id,collection_id,negotiation_id,snapshot_hash)
          values('hh.ru',$1,$2,$3,$4,$5) on conflict(host,employer_id,vacancy_id,collection_id,negotiation_id)
          do update set snapshot_hash=excluded.snapshot_hash,last_seen_at=now()`,
        [employerId, vacancyId, collectionId, id, collectionHash])
      }
      await client.query('commit')
      return { replay: false, inserted }
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally { client.release() }
  }

  async function webhookEvent({ applicationId, subscriptionId, callbackId, payloadHash, eventType, vacancyId, negotiationId }) {
    const inserted = await pool.query(`insert into hh_webhook_events
      (host,application_id,subscription_id,callback_id,payload_hash,event_type,vacancy_id,negotiation_id)
      values('hh.ru',$1,$2,$3,$4,$5,$6,$7) on conflict do nothing returning callback_id`,
    [applicationId, subscriptionId, callbackId, payloadHash, eventType, vacancyId, negotiationId])
    if (inserted.rowCount) return 'accepted'
    const existing = await pool.query(`select payload_hash from hh_webhook_events
      where host='hh.ru' and application_id=$1 and subscription_id=$2 and callback_id=$3`,
    [applicationId, subscriptionId, callbackId])
    return existing.rows[0]?.payload_hash === payloadHash ? 'duplicate' : 'conflict'
  }

  async function status() {
    const { rows } = await pool.query(`select status,application_id,manager_id,employer_id,
      webhook_subscription_id,last_sync_at,last_error_code,token_version from hh_connections where id='hh-ru-employer'`)
    return rows[0] || null
  }

  async function markSync() {
    await pool.query("update hh_connections set last_sync_at=now(),last_error_code=null,updated_at=now() where id='hh-ru-employer'")
  }

  async function markError(code) {
    await pool.query("update hh_connections set last_error_code=$1,updated_at=now() where id='hh-ru-employer'", [code])
  }

  return { consumeSession, saveToken, verifyManager, connection, auditCounts, updateTokens, recoveryRequired, saveSubscription,
    saveVacancy, inScopeVacancy, savePage, webhookEvent, status, markSync, markError,
    findNegotiationsByResume, saveChatLinkRun, chatLinkReadback }
}

module.exports = { hhStore }
