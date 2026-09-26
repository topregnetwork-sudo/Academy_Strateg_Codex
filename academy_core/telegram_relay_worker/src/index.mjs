const encoder = new TextEncoder()

function response(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })
}

function hex(bytes) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function equal(a, b) {
  if (a.length !== b.length) return false
  let value = 0
  for (let index = 0; index < a.length; index += 1) value |= a.charCodeAt(index) ^ b.charCodeAt(index)
  return value === 0
}

async function sign(token, canonical) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(token), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return hex(await crypto.subtle.sign('HMAC', key, encoder.encode(canonical)))
}

function allowed(env, chatId, threadId) {
  const key = `${String(chatId)}:${Number(threadId || 0)}`
  return String(env.ALLOWED_DESTINATIONS || '').split(',').map((item) => item.trim()).includes(key)
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === '/health') return response(200, { ok: true, enabled: env.RELAY_ENABLED === 'true' })
    if (url.pathname !== '/v1/send-message' || request.method !== 'POST') return response(404, { ok: false })
    if (env.RELAY_ENABLED !== 'true') return response(404, { ok: false })

    const token = String(request.headers.get('x-telegram-token') || '')
    const timestamp = String(request.headers.get('x-relay-timestamp') || '')
    const signature = String(request.headers.get('x-relay-signature') || '')
    const idempotencyKey = String(request.headers.get('idempotency-key') || '')
    if (!token || !/^\d{10,13}$/.test(timestamp) || !/^[a-f0-9]{64}$/.test(signature) || !/^[a-zA-Z0-9:._-]{16,180}$/.test(idempotencyKey)) return response(401, { ok: false })
    if (Math.abs(Date.now() - Number(timestamp)) > 120000) return response(401, { ok: false })

    const raw = await request.text()
    if (raw.length > 8192) return response(413, { ok: false })
    const expected = await sign(token, `${timestamp}\n${idempotencyKey}\n${raw}`)
    if (!equal(signature, expected)) return response(401, { ok: false })

    let body
    try { body = JSON.parse(raw) } catch { return response(400, { ok: false }) }
    const chatId = String(body.chat_id || '')
    const threadId = Number(body.message_thread_id || 0)
    const text = String(body.text || '')
    if (!allowed(env, chatId, threadId) || !text.startsWith('ТЕСТ ·') || text.length > 1500) return response(403, { ok: false })

    const telegram = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, ...(threadId ? { message_thread_id: threadId } : {}), text, disable_web_page_preview: true }),
    })
    const result = await telegram.json().catch(() => null)
    if (!telegram.ok || result?.ok !== true || !result?.result?.message_id) return response(502, { ok: false, code: `telegram_${Number(result?.error_code || telegram.status || 500)}` })
    return response(200, { ok: true, result: { message_id: Number(result.result.message_id), chat: { id: String(result.result.chat?.id || chatId) } } })
  },
}

export { allowed, equal, sign }
