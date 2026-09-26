const encoder = new TextEncoder()
const ROUTES = Object.freeze({
  '3744984501': { city: 'Минск', chatId: '-1004404302282', threadId: 4 },
  '4215769301': { city: 'Челябинск', chatId: '-1004404302282', threadId: 2 },
})

function json(status, body) { return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } }) }
function hex(bytes) { return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('') }
function equal(a, b) { if (a.length !== b.length) return false; let value = 0; for (let i = 0; i < a.length; i += 1) value |= a.charCodeAt(i) ^ b.charCodeAt(i); return value === 0 }
async function sha256(value) { return hex(await crypto.subtle.digest('SHA-256', encoder.encode(value))) }
function allowed(env, chatId, threadId) { return String(env.ALLOWED_DESTINATIONS || '').split(',').map((item) => item.trim()).includes(`${String(chatId)}:${Number(threadId || 0)}`) }

function normalizePayload(raw, contentType) {
  const input = contentType.includes('application/json') ? JSON.parse(raw || '{}') : Object.fromEntries(new URLSearchParams(raw))
  return {
    projectId: String(input.project_id || input.projectid || '8607529').trim(),
    formId: String(input.form_id || input.formid || '').replace(/^form/i, '').trim(),
    transactionId: String(input.transaction_id || input.tranid || '').trim(),
    ownerPhone: String(input.Phone || input.phone || '').replace(/\D/g, ''),
  }
}

async function sendTelegram(env, route, text) {
  const telegram = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: route.chatId, message_thread_id: route.threadId, text, disable_web_page_preview: true }),
  })
  const result = await telegram.json().catch(() => null)
  if (!telegram.ok || result?.ok !== true || !result?.result?.message_id) throw new Error(`telegram_${Number(result?.error_code || telegram.status || 500)}`)
  return Number(result.result.message_id)
}

async function handleRegistration(request, env) {
  if (env.TILDA_DIRECT_ENABLED !== 'true') return json(404, { ok: false })
  if (!env.TELEGRAM_BOT_TOKEN || !env.OWNER_PHONE_SHA256) return json(503, { ok: false })
  if (Number(request.headers.get('content-length') || 0) > 16384) return json(413, { ok: false })
  const raw = await request.text()
  if (raw.length > 16384) return json(413, { ok: false })
  let payload
  try { payload = normalizePayload(raw, String(request.headers.get('content-type') || '')) } catch { return json(400, { ok: false }) }
  const route = ROUTES[payload.formId]
  if (payload.projectId !== '8607529' || !route || !payload.transactionId || payload.transactionId.length > 160 || !allowed(env, route.chatId, route.threadId)) return json(403, { ok: false })
  const ownerPhoneHash = await sha256(payload.ownerPhone)
  if (!payload.ownerPhone || !equal(ownerPhoneHash, String(env.OWNER_PHONE_SHA256))) return json(202, { ok: true, ignored: true })

  const receiptHash = await sha256(`tilda:v1:${payload.projectId}:${payload.formId}:${payload.transactionId}`)
  const inserted = await env.RECEIPTS.prepare("insert into receipts(receipt_hash,form_id,state,created_at) values(?1,?2,'processing',datetime('now')) on conflict(receipt_hash) do nothing").bind(receiptHash, payload.formId).run()
  if (!inserted.meta?.changes) {
    const existing = await env.RECEIPTS.prepare('select state from receipts where receipt_hash=?1').bind(receiptHash).first()
    return new Response('ok', { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8', 'x-academy-duplicate': 'true', 'x-academy-state': String(existing?.state || 'processing') } })
  }
  try {
    const marker = receiptHash.slice(0, 12)
    const messageId = await sendTelegram(env, route, `Новая регистрация на мероприятие · ${route.city}\nБез персональных данных\nКод: ${marker}`)
    await env.RECEIPTS.prepare("update receipts set state='delivered',message_id=?2 where receipt_hash=?1").bind(receiptHash, messageId).run()
    return new Response('ok', { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8', 'x-academy-duplicate': 'false', 'x-academy-receipt': marker } })
  } catch (error) {
    await env.RECEIPTS.prepare('delete from receipts where receipt_hash=?1').bind(receiptHash).run()
    return json(502, { ok: false, code: String(error?.message || 'telegram_failed').slice(0, 40) })
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === '/health') return json(200, { ok: true, enabled: env.TILDA_DIRECT_ENABLED === 'true', forms: Object.keys(ROUTES), raw_pii_persisted: false })
    if (url.pathname !== '/v1/tilda-registration' || request.method !== 'POST') return json(404, { ok: false })
    return handleRegistration(request, env)
  },
}

export { ROUTES, allowed, equal, normalizePayload, sha256 }
