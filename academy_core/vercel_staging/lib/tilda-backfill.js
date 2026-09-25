async function runTildaBackfill({ rows, repository, outbox, botToken, deliver }) {
  if (!Array.isArray(rows) || !rows.length || rows.length > 500) throw new Error('backfill_row_count_invalid')
  const evidence = []
  for (const row of rows) {
    const ingested = await repository.ingest(row, { mirrorEnabled: true })
    const delivery = await deliver({ repository: outbox, idempotencyKey: ingested.idempotency_key, botToken })
    evidence.push({ form_id: String(row.formid || row.form_id || '').replace(/^form/i, ''), transaction_id: String(row.tranid || row.transaction_id || ''), inserted: ingested.inserted, duplicate: ingested.duplicate, state: delivery.state, message_id: delivery.messageId, delivery_duplicate: delivery.duplicate })
  }
  return { rows: evidence.length, delivered: evidence.filter((item) => item.state === 'delivered').length, evidence }
}

module.exports = { runTildaBackfill }
