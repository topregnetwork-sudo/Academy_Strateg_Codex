const API_ROOT = 'https://api.telegram.org'

function safeTelegramError(body, status) {
  const code = Number(body?.error_code || status || 500)
  const error = new Error(`telegram_send_failed_${code}`)
  error.code = `telegram_${code}`
  return error
}

async function sendText({ botToken, chatId, text, fetchImpl = fetch }) {
  if (!botToken) throw new Error('telegram_bot_token_not_configured')
  const response = await fetchImpl(`${API_ROOT}/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: String(chatId), text, disable_web_page_preview: true }),
  })
  const body = await response.json().catch(() => null)
  if (!response.ok || body?.ok !== true || !body?.result?.message_id) {
    throw safeTelegramError(body, response.status)
  }
  return { messageId: Number(body.result.message_id), chatId: String(body.result.chat?.id || chatId) }
}

module.exports = { API_ROOT, sendText }
