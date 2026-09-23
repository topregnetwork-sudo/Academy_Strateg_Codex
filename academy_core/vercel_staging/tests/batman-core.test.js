const test = require('node:test')
const assert = require('node:assert/strict')
const { normalizeCommand, startPayload, nextStage, featureEnabled } = require('../lib/batman-core')
const { candidateFolderName, candidateFolderPlan } = require('../lib/batman-storage')

test('preserves canonical and legacy Batman commands', () => {
  assert.equal(normalizeCommand('/start').name, 'start')
  assert.equal(normalizeCommand('вступить в группу').name, 'group_codeword')
  assert.equal(normalizeCommand('ГОТОВ РАБОТАТЬ').name, 'ready')
  assert.equal(normalizeCommand('Бэтмен').name, 'ready_legacy')
  assert.equal(normalizeCommand('бетмен').name, 'ready_legacy')
  assert.equal(normalizeCommand('Команда').name, 'team_invite')
  assert.equal(normalizeCommand('Моя статистика').name, 'statistics')
})

test('accepts only an opaque application deep-link', () => {
  assert.deepEqual(startPayload(''), { kind: 'plain' })
  assert.equal(startPayload('batman_app_12345678901234567890').kind, 'application')
  assert.deepEqual(startPayload('batman_app_short'), { kind: 'plain' })
})

test('does not activate Batman from start, booking or codeword alone', () => {
  assert.equal(nextStage('questionnaire_completed', 'start'), 'telegram_identity_linked')
  assert.equal(nextStage('zoom_codeword_pending', 'group_codeword'), 'group_2days_access_granted')
  assert.equal(nextStage('group_2days_access_granted', 'ready'), 'active_batman')
  assert.equal(nextStage('group_2days_access_granted', 'ready_legacy'), 'active_batman')
})

test('all live gates default closed', () => {
  assert.equal(featureEnabled({}, 'BATMAN_REAL_PII_ENABLED'), false)
  assert.equal(featureEnabled({ BATMAN_REAL_PII_ENABLED: 'false' }, 'BATMAN_REAL_PII_ENABLED'), false)
  assert.equal(featureEnabled({ BATMAN_REAL_PII_ENABLED: 'true' }, 'BATMAN_REAL_PII_ENABLED'), true)
})

test('builds one stable Yandex Disk folder per candidate', () => {
  assert.equal(candidateFolderName('Иванов Иван', 'HR-0143'), 'Иванов Иван — HR-0143')
  assert.equal(candidateFolderName(' Иванов / Иван ', 'HR:0143'), 'Иванов Иван — HR 0143')
  assert.deepEqual(candidateFolderPlan({
    profileId: '00000000-0000-0000-0000-000000000143',
    fullName: 'Иванов Иван',
    candidateId: 'HR-0143',
  }), {
    provider: 'yandex_disk',
    root: '00 Кандидаты — именные папки',
    folderName: 'Иванов Иван — HR-0143',
    folderPath: '00 Кандидаты — именные папки/Иванов Иван — HR-0143',
    idempotencyKey: 'candidate-folder:00000000-0000-0000-0000-000000000143',
  })
})
