const CANDIDATE_ROOT = '00 Кандидаты — именные папки'

function safeFolderPart(value, fallback) {
  const clean = String(value ?? '')
    .normalize('NFKC')
    .replace(/[\\/:*?"<>|\u0000-\u001F]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '')
    .trim()
  return (clean || fallback).slice(0, 80)
}

function candidateFolderName(fullName, candidateId) {
  const name = safeFolderPart(fullName, 'Без имени')
  const id = safeFolderPart(candidateId, 'ID не назначен')
  return `${name} — ${id}`
}

function candidateFolderPlan({ profileId, fullName, candidateId }) {
  if (!profileId) throw new Error('profile_id_required')
  const folderName = candidateFolderName(fullName, candidateId)
  return {
    provider: 'yandex_disk',
    root: CANDIDATE_ROOT,
    folderName,
    folderPath: `${CANDIDATE_ROOT}/${folderName}`,
    idempotencyKey: `candidate-folder:${profileId}`,
  }
}

module.exports = { CANDIDATE_ROOT, safeFolderPart, candidateFolderName, candidateFolderPlan }
