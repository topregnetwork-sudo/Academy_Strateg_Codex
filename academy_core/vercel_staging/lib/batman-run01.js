const { createHash } = require('node:crypto')
const { sendText } = require('./telegram-bot')

const RUN01_VERSION = 'batman_owner_run01_v1'
const PARTICIPANT_TEXT = [
  'ТЕСТ · Batman owner-only RUN-01.',
  '',
  'Спасибо, анкета принята.',
  'Следующий шаг — общая Zoom-встреча Академии Стратег: знакомство, ответы на вопросы и условия дальнейшего участия.',
  '',
  'Это закрытая проверка Preview. Запись на Zoom, статус кандидата, production и рабочий webhook не изменялись.',
].join('\n')
const CONTROL_TEXT = [
  'ТЕСТ · Batman RUN-01 · контрольный бриф',
  '',
  'Анкета, согласие, источник, Telegram identity, одна journey и одна карточка записаны в Preview.',
  'Это закрытая owner-only проверка; реальные кандидаты и production не затронуты.',
].join('\n')

function stableUuid(kind, value) {
  const hex = createHash('sha256').update(`${kind}:${value}`).digest('hex').slice(0, 32).split('')
  hex[12] = '5'
  hex[16] = ['8', '9', 'a', 'b'][parseInt(hex[16], 16) % 4]
  const joined = hex.join('')
  return `${joined.slice(0, 8)}-${joined.slice(8, 12)}-${joined.slice(12, 16)}-${joined.slice(16, 20)}-${joined.slice(20)}`
}
function boundedRunId(value) {
  const runId = String(value || '').trim()
  if (!/^BATMAN_OWNER_RUN01_[A-Z0-9_-]{8,80}$/.test(runId)) throw new Error('run01_id_invalid')
  return runId
}

function exactOwnerUpdate(update, expectedChatId) {
  const updateId = Number(update?.update_id)
  const chatId = String(update?.message?.chat?.id || '')
  const userId = String(update?.message?.from?.id || '')
  const text = String(update?.message?.text || '').trim()
  if (!Number.isSafeInteger(updateId) || !chatId || !userId) throw new Error('run01_update_invalid')
  if (chatId !== String(expectedChatId) || userId !== String(expectedChatId)) throw new Error('run01_owner_mismatch')
  if (!/^\/start\s+batman_app_[A-Za-z0-9_-]{20,48}$/.test(text)) throw new Error('run01_start_payload_invalid')
  return { updateId, chatId, userId, text, username: String(update.message.from?.username || '') }
}

function createRun01Repository(pool) {
  return {
    async rollbackFailed(runId) {
      const id = boundedRunId(runId)
      const profileId = stableUuid('profile', id)
      const journeyId = stableUuid('journey', id)
      const client = await pool.connect()
      try {
        await client.query('begin')
        const guard = await client.query(`
          select
            (select count(*)::int from batman_profiles where id=$1 and synthetic=true) as synthetic_profiles,
            (select count(*)::int from batman_telegram_outbox where journey_id=$2 and delivery_state='delivered') as delivered,
            (select count(*)::int from batman_activations where journey_id=$2) as activations,
            (select count(*)::int from batman_referral_links where journey_id=$2) as referral_links,
            (select count(*)::int from batman_zoom_bookings where journey_id=$2) as zoom_bookings
        `, [profileId, journeyId])
        const state = guard.rows[0]
        if (!state.synthetic_profiles) {
          await client.query('commit')
          return { rolled_back: false, reason: 'absent', deleted: 0 }
        }
        if (state.delivered || state.activations || state.referral_links || state.zoom_bookings) {
          throw new Error('run01_rollback_guard_failed')
        }
        let deleted = 0
        for (const [sql, params] of [
          ['delete from batman_telegram_outbox where journey_id=$1', [journeyId]],
          ['delete from batman_domain_events where journey_id=$1', [journeyId]],
          ["delete from batman_telegram_updates where payload->>'run_id'=$1", [id]],
          ['delete from batman_telegram_identities where journey_id=$1', [journeyId]],
          ['delete from batman_journeys where id=$1', [journeyId]],
          ['delete from batman_profiles where id=$1 and synthetic=true', [profileId]],
        ]) {
          const result = await client.query(sql, params)
          deleted += result.rowCount
        }
        await client.query('commit')
        return { rolled_back: true, reason: 'undelivered_synthetic_only', deleted }
      } catch (error) {
        await client.query('rollback')
        throw error
      } finally {
        client.release()
      }
    },

    async prepare({ runId, botKey, update, expectedChatId }) {
      const id = boundedRunId(runId)
      const normalized = exactOwnerUpdate(update, expectedChatId)
      const profileId = stableUuid('profile', id)
      const journeyId = stableUuid('journey', id)
      const applicationHash = createHash('sha256').update(normalized.text.split('batman_app_')[1]).digest('hex')
      const client = await pool.connect()
      try {
        await client.query('begin')
        const profile = await client.query(`
          insert into batman_profiles(
            id, application_code_hash, full_name, city, telegram_username, phone, motivation,
            questionnaire_version, consent_version, consent_accepted_at, source_id, campaign_id,
            inviter_code, synthetic
          ) values ($1,$2,'Owner Preview RUN-01','Тест',null,null,'Owner-only Preview E2E',1,
            'owner_run01_v1',now(),'owner_preview',$3,null,true)
          on conflict (application_code_hash) do nothing returning id
        `, [profileId, applicationHash, id])
        const journey = await client.query(`
          insert into batman_journeys(id,profile_id,entry_route,current_stage,next_action)
          values ($1,$2,'new_batman','bot_started','zoom_rsvp')
          on conflict (id) do nothing returning id
        `, [journeyId, profileId])
        const identity = await client.query(`
          insert into batman_telegram_identities(telegram_user_id,journey_id,chat_id,username)
          values ($1,$2,$3,$4)
          on conflict (telegram_user_id) do update set username=excluded.username
          where batman_telegram_identities.journey_id=excluded.journey_id
          returning telegram_user_id
        `, [normalized.userId, journeyId, normalized.chatId, normalized.username || null])
        if (identity.rowCount !== 1) throw new Error('run01_identity_conflict')
        const telegramUpdate = await client.query(`
          insert into batman_telegram_updates(bot_key,update_id,journey_id,normalized_command,payload)
          values ($1,$2,$3,'start',$4::jsonb)
          on conflict (bot_key,update_id) do nothing returning update_id
        `, [botKey, normalized.updateId, journeyId, JSON.stringify({ synthetic: true, run_id: id })])

        let eventsCreated = 0
        for (const eventType of ['questionnaire_completed','consent_recorded','telegram_handoff_created','bot_started','identity_resolved']) {
          const key = `${id}:${eventType}`
          const inserted = await client.query(`
            insert into batman_domain_events(id,journey_id,event_type,idempotency_key,payload)
            values ($1,$2,$3,$4,$5::jsonb)
            on conflict (idempotency_key) do nothing returning id
          `, [stableUuid('event', key), journeyId, eventType, key, JSON.stringify({ synthetic: true, run_id: id })])
          eventsCreated += inserted.rowCount
        }

        let outboxCreated = 0
        for (const message of [
          { kind: 'run01_participant_m01', text: PARTICIPANT_TEXT },
          { kind: 'run01_control_brief', text: CONTROL_TEXT },
        ]) {
          const key = `${id}:${message.kind}`
          const inserted = await client.query(`
            insert into batman_telegram_outbox(id,journey_id,chat_id,message_kind,payload,idempotency_key)
            values ($1,$2,$3,$4,$5::jsonb,$6)
            on conflict (idempotency_key) do nothing returning id
          `, [stableUuid('outbox', key), journeyId, normalized.chatId, message.kind, JSON.stringify({ text: message.text, synthetic: true, run_id: id }), key])
          outboxCreated += inserted.rowCount
        }
        await client.query('commit')
        return {
          runId: id,
          profileId,
          journeyId,
          created: {
            profile: profile.rowCount,
            journey: journey.rowCount,
            telegram_update: telegramUpdate.rowCount,
            events: eventsCreated,
            outbox: outboxCreated,
          },
        }
      } catch (error) {
        await client.query('rollback')
        throw error
      } finally {
        client.release()
      }
    },

    async queued(runId) {
      const result = await pool.query(`
        select id,chat_id,message_kind,payload,idempotency_key,delivery_state,telegram_message_id
        from batman_telegram_outbox
        where idempotency_key in ($1,$2)
        order by case message_kind when 'run01_participant_m01' then 1 else 2 end
      `, [`${runId}:run01_participant_m01`, `${runId}:run01_control_brief`])
      return result.rows
    },

    async lease(outboxId) {
      const result = await pool.query(`
        update batman_telegram_outbox set delivery_state='processing',last_error=null
        where id=$1 and delivery_state='queued'
        returning id,chat_id,message_kind,payload,idempotency_key
      `, [outboxId])
      return result.rows[0] || null
    },

    async delivered(job, messageId) {
      await pool.query(`
        update batman_telegram_outbox set delivery_state='delivered',telegram_message_id=$2,
          delivered_at=now(),last_error=null where id=$1 and delivery_state='processing'
      `, [job.id, messageId])
    },

    async failed(job, code) {
      await pool.query(`
        update batman_telegram_outbox set delivery_state='failed',last_error=$2
        where id=$1 and delivery_state='processing'
      `, [job.id, String(code).slice(0, 120)])
    },

    async readback(runId, profileId, journeyId) {
      const result = await pool.query(`
        select
          (select count(*)::int from batman_profiles where id=$1 and synthetic=true) as profiles,
          (select count(*)::int from batman_journeys where id=$2) as journeys,
          (select count(*)::int from batman_telegram_identities where journey_id=$2) as identities,
          (select count(*)::int from operator_batman_queue where journey_id=$2) as visible_cards,
          (select count(*)::int from batman_domain_events where journey_id=$2 and idempotency_key like $3) as domain_events,
          (select count(*)::int from batman_telegram_outbox where journey_id=$2 and idempotency_key like $3) as outbox_total,
          (select count(*)::int from batman_telegram_outbox where journey_id=$2 and idempotency_key like $3 and delivery_state='delivered') as outbox_delivered,
          (select count(*)::int from batman_activations where journey_id=$2) as activations,
          (select count(*)::int from batman_referral_links where journey_id=$2) as referral_links
      `, [profileId, journeyId, `${runId}:%`])
      return result.rows[0]
    },
  }
}

async function runOwnerOnlyRun01({ repository, botKey, botToken, expectedChatId, runId, update, fetchImpl = fetch }) {
  const prepared = await repository.prepare({ runId, botKey, update, expectedChatId })
  const rows = await repository.queued(prepared.runId)
  const messageIds = []
  for (const row of rows) {
    if (row.delivery_state === 'delivered') {
      messageIds.push(Number(row.telegram_message_id))
      continue
    }
    const job = await repository.lease(row.id)
    if (!job) throw new Error('run01_outbox_not_leasable')
    try {
      const sent = await sendText({ botToken, chatId: expectedChatId, text: job.payload.text, idempotencyKey: job.idempotency_key, fetchImpl })
      await repository.delivered(job, sent.messageId)
      messageIds.push(sent.messageId)
    } catch (error) {
      await repository.failed(job, error?.code || error?.message || 'telegram_send_failed')
      throw error
    }
  }
  const readback = await repository.readback(prepared.runId, prepared.profileId, prepared.journeyId)
  const createdTotal = Object.values(prepared.created).reduce((sum, value) => sum + Number(value || 0), 0)
  return {
    contract: RUN01_VERSION,
    state: 'delivered',
    duplicate: createdTotal === 0,
    message_ids: messageIds,
    created: prepared.created,
    readback,
    pii_exposed: false,
  }
}

module.exports = {
  RUN01_VERSION,
  PARTICIPANT_TEXT,
  CONTROL_TEXT,
  stableUuid,
  boundedRunId,
  exactOwnerUpdate,
  createRun01Repository,
  runOwnerOnlyRun01,
}
