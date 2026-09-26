const crypto = require('node:crypto')
const API_ROOT = 'https://api.telegram.org'
const DEFAULT_RELAY_URL = 'https://academy-telegram-relay-run00r.academy-strateg-network.workers.dev/v1/send-message'

function safeTelegramError(body, status) {
  const code = Number(body?.error_code || status || 500)
  const error = new Error(`telegram_send_failed_${code}`)
  error.code = `telegram_${code}`
  return error
}

function relaySignature(botToken, timestamp, idempotencyKey, raw) {
  return crypto.createHmac('sha256', botToken).update(`${timestamp}\n${idempotencyKey}\n${raw}`).digest('hex')
}

async function sendText({ botToken, chatId, messageThreadId, text, idempotencyKey, relayUrl = process.env.TELEGRAM_RELAY_URL || DEFAULT_RELAY_URL, fetchImpl = fetch }) {
  if (!botToken) throw new Error('telegram_bot_token_not_configured')
  const payload = { chat_id: String(chatId), ...(messageThreadId ? { message_thread_id: Number(messageThreadId) } : {}), text, disable_web_page_preview: true }
  const raw = JSON.stringify(payload)
  const useRelay = Boolean(relayUrl)
  const timestamp = String(Date.now())
  if (useRelay && !idempotencyKey) throw new Error('telegram_relay_idempotency_key_required')
  const response = await fetchImpl(useRelay ? relayUrl : `${API_ROOT}/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(useRelay ? { 'x-telegram-token': botToken, 'x-relay-timestamp': timestamp, 'x-relay-signature': relaySignature(botToken, timestamp, idempotencyKey, raw), 'idempotency-key': idempotencyKey } : {}) },
    body: raw,
  })
  const body = await response.json().catch(() => null)
  if (!response.ok || body?.ok !== true || !body?.result?.message_id) {
    throw safeTelegramError(body, response.status)
  }
  return { messageId: Number(body.result.message_id), chatId: String(body.result.chat?.id || chatId) }
}

module.exports = { API_ROOT, DEFAULT_RELAY_URL, relaySignature, sendText }
