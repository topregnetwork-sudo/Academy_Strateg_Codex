const STAGES = Object.freeze([
  'questionnaire_completed','telegram_identity_linked','zoom_slot_selected','zoom_booked',
  'zoom_codeword_pending','group_2days_access_granted','ready_to_work_pending','active_batman',
  'owner_invite_enabled','batman_invite_enabled'
])

function normalizeCommand(text = '') {
  const value = String(text).trim()
  const lower = value.toLocaleLowerCase('ru-RU')
  if (lower.startsWith('/start')) return { name: 'start', argument: value.split(/\s+/, 2)[1] || '' }
  if (lower === 'вступить в группу') return { name: 'group_codeword' }
  if (lower === 'готов работать') return { name: 'ready' }
  if (lower === 'бэтмен' || lower === 'бетмен') return { name: 'ready_legacy' }
  if (lower === 'команда') return { name: 'team_invite' }
  if (lower === 'моя статистика') return { name: 'statistics' }
  if (lower === 'группа') return { name: 'group' }
  return { name: 'unknown' }
}

function startPayload(argument = '') {
  const match = /^batman_app_([A-Za-z0-9_-]{20,96})$/.exec(argument)
  return match ? { kind: 'application', opaqueCode: match[1] } : { kind: 'plain' }
}

function nextStage(current, command) {
  if (!STAGES.includes(current)) throw new Error('unknown_stage')
  if (command === 'start' && current === 'questionnaire_completed') return 'telegram_identity_linked'
  if (command === 'group_codeword' && current === 'zoom_codeword_pending') return 'group_2days_access_granted'
  if ((command === 'ready' || command === 'ready_legacy') && ['group_2days_access_granted','ready_to_work_pending'].includes(current)) return 'active_batman'
  return current
}

function featureEnabled(env, name) { return env?.[name] === 'true' }

module.exports = { STAGES, normalizeCommand, startPayload, nextStage, featureEnabled }
