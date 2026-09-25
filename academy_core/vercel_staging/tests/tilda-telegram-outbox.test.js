const test = require('node:test')
const assert = require('node:assert/strict')
const { deliverTildaTelegramOutbox, releaseAndDeliverTildaSelftest } = require('../lib/tilda-telegram-outbox')

function repository(state = 'queued') {
  const row = { delivery_state: state, delivery_attempts: 0, telegram_message_id: state === 'delivered' ? 77 : null }
  return {
    row,
    async queueSelftest() { if (row.delivery_state !== 'held') return false; row.delivery_state='queued'; return true },
    async read() { return { ...row } },
    async claimOne() { if (row.delivery_state !== 'queued') return null; row.delivery_state='processing'; row.delivery_attempts++; return { id:'1',chat_id:'-1001',message_thread_id:4,payload:{text:'Новая регистрация на мероприятие · Минск'} } },
    async markDelivered(_id, messageId) { row.delivery_state='delivered'; row.telegram_message_id=messageId },
    async markFailed(_id, code) { row.delivery_state='failed'; row.last_error=code },
  }
}

test('delivers once to the configured forum topic and replay creates no new send', async () => {
  const repo = repository(); let sends = 0
  const fetchImpl = async (_url, options) => { sends++; const body=JSON.parse(options.body); assert.equal(body.message_thread_id,4); assert.equal(body.chat_id,'-1001'); return { ok:true, json:async()=>({ok:true,result:{message_id:88,chat:{id:-1001}}}) } }
  const first = await deliverTildaTelegramOutbox({repository:repo,idempotencyKey:'k',botToken:'secret',fetchImpl})
  const replay = await deliverTildaTelegramOutbox({repository:repo,idempotencyKey:'k',botToken:'secret',fetchImpl})
  assert.equal(first.messageId,88); assert.equal(replay.duplicate,true); assert.equal(sends,1)
})

test('bounded selftest release queues then delivers exactly once', async () => {
  const repo = repository('held'); let sends = 0
  const fetchImpl = async () => { sends++; return { ok:true, json:async()=>({ok:true,result:{message_id:99,chat:{id:-1001}}}) } }
  const first = await releaseAndDeliverTildaSelftest({repository:repo,idempotencyKey:'selftest',botToken:'secret',fetchImpl})
  const replay = await releaseAndDeliverTildaSelftest({repository:repo,idempotencyKey:'selftest',botToken:'secret',fetchImpl})
  assert.equal(first.selftest_released,true); assert.equal(replay.duplicate,true); assert.equal(sends,1)
})

test('stores only a safe error code on Telegram failure', async () => {
  const repo = repository()
  await assert.rejects(() => deliverTildaTelegramOutbox({repository:repo,idempotencyKey:'k',botToken:'secret',fetchImpl:async()=>({ok:false,status:429,json:async()=>({error_code:429,description:'sensitive'})})}), /telegram_send_failed_429/)
  assert.equal(repo.row.last_error,'telegram_429')
})
