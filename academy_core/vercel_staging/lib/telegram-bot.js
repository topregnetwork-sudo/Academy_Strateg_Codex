const crypto = require('node:crypto')
const API_ROOT = 'https://api.telegram.org'
const DEFAULT_RELAY_URL = 'https://academy-telegram-relay-run00r.academy-strateg-network.workers.dev/v1/send-message'

function safeTelegramError(body, status) {
  const code = Number(body?.error_code || status || 500)
  const description = String(body?.description || '').toLowerCase()
  const reason = description.includes('chat not found') ? 'chat_not_found'
    : description.includes('bot was blocked') ? 'bot_blocked'
      : description.includes('user is deactivated') ? 'user_deactivated'
        : description.includes('message is too long') ? 'message_too_long'
          : 'request_rejected'
  const error = new Error(`telegram_send_failed_${code}_${reason}`)
  error.code = `telegram_${code}_${reason}`
  return error
}

function relaySignature(botToken, timestamp, idempotencyKey, raw) {
  return crypto.createHmac('sha256', botToken).update(`${timestamp}\n${idempotencyKey}\n${raw}`).digest('hex')
}

async function telegramJson({ botToken, method, payload = {}, fetchImpl = fetch }) {
  const response = await fetchImpl(`${API_ROOT}/bot${botToken}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const body = await response.json().catch(() => null)
  return { ok: response.ok && body?.ok === true, status: response.status, body }
}

async function diagnosePrivateChat({ botToken, expectedChatId, fetchImpl = fetch }) {
  if (!botToken) throw new Error('telegram_bot_token_not_configured')
  const me = await telegramJson({ botToken, method: 'getMe', fetchImpl })
  const webhook = await telegramJson({ botToken, method: 'getWebhookInfo', fetchImpl })
  const chat = await telegramJson({ botToken, method: 'getChat', payload: { chat_id: String(expectedChatId) }, fetchImpl })
  const webhookActive = Boolean(webhook.ok && webhook.body?.result?.url)
  let candidates = []
  if (!webhookActive) {
    const updates = await telegramJson({ botToken, method: 'getUpdates', payload: { limit: 100, timeout: 0, allowed_updates: ['message'] }, fetchImpl })
    if (updates.ok && Array.isArray(updates.body?.result)) {
      candidates = updates.body.result
        .map((item) => item?.message)
        .filter((message) => message?.chat?.type === 'private' && /^\/start(?:\s|$)/.test(String(message?.text || '')))
        .map((message) => ({ chat_id: String(message.chat.id), user_id: String(message.from?.id || ''), date: Number(message.date || 0) }))
        .filter((item, index, all) => all.findIndex((other) => other.chat_id === item.chat_id) === index)
        .slice(-10)
    }
  }
  return {
    bot_ready: me.ok,
    webhook_active: webhookActive,
    expected_chat_reachable: chat.ok,
    expected_chat_error: chat.ok ? null : safeTelegramError(chat.body, chat.status).code,
    start_candidates: candidates,
    values_exposed: false,
  }
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

module.exports = { API_ROOT, DEFAULT_RELAY_URL, relaySignature, sendText, diagnosePrivateChat }
