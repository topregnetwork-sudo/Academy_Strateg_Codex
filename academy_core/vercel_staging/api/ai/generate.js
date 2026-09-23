const ALLOWED_TASKS = new Set(['event', 'test', 'team', 'vacancy'])
const ALLOWED_CHANNELS = new Set(['Telegram', 'VK', 'WhatsApp Status', 'Личная переписка', 'Лендинг'])

function clean(value, limit) {
  return String(value || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, limit)
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return response.status(405).json({ error: 'method_not_allowed' })
  }

  const apiKey = process.env.YANDEX_AI_API_KEY
  const folderId = process.env.YANDEX_AI_FOLDER_ID
  if (!apiKey || !folderId) {
    return response.status(503).json({
      error: 'yandex_ai_not_configured',
      detail: 'Yandex AI Studio is prepared but no staging credentials are configured.'
    })
  }

  const task = clean(request.body?.task, 32)
  const channel = clean(request.body?.channel, 32)
  const city = clean(request.body?.city, 80)
  const speaker = clean(request.body?.speaker, 100)
  const instruction = clean(request.body?.instruction, 2000)
  const currentDraft = clean(request.body?.currentDraft, 5000)

  if (!ALLOWED_TASKS.has(task) || !ALLOWED_CHANNELS.has(channel) || !city || !instruction) {
    return response.status(400).json({ error: 'invalid_request' })
  }

  const taskNames = {
    event: 'анонс мероприятия',
    test: 'приглашение заполнить бизнес-тест',
    team: 'приглашение в команду Batman',
    vacancy: 'объявление для источника'
  }
  const system = [
    'Ты пользовательский AI-помощник Академии Стратег.',
    'Подготовь только готовый черновик на русском языке.',
    'Не выдумывай даты, имена, цены, гарантии, результаты и ссылки.',
    'Если подтвержденных данных не хватает, используй нейтральную формулировку или пометку [уточнить].',
    'Не добавляй персональные данные. Публикация выполняется человеком отдельно.'
  ].join(' ')
  const prompt = [
    `Задача: ${taskNames[task]}.`,
    `Канал: ${channel}. Город: ${city}. Спикер: ${speaker || '[не указан]'}.`,
    currentDraft ? `Текущий черновик:\n${currentDraft}` : '',
    `Команда пользователя: ${instruction}`
  ].filter(Boolean).join('\n\n')

  try {
    const upstream = await fetch('https://llm.api.cloud.yandex.net/foundationModels/v1/completion', {
      method: 'POST',
      headers: {
        Authorization: `Api-Key ${apiKey}`,
        'Content-Type': 'application/json',
        'x-folder-id': folderId
      },
      body: JSON.stringify({
        modelUri: `gpt://${folderId}/yandexgpt-lite/latest`,
        completionOptions: { stream: false, temperature: 0.45, maxTokens: 700 },
        messages: [
          { role: 'system', text: system },
          { role: 'user', text: prompt }
        ]
      }),
      signal: AbortSignal.timeout(30000)
    })
    const payload = await upstream.json().catch(() => ({}))
    const text = payload?.result?.alternatives?.[0]?.message?.text
    if (!upstream.ok || !text) {
      return response.status(502).json({ error: 'yandex_ai_failed', detail: 'The model did not return a usable draft.' })
    }
    return response.status(200).json({
      ok: true,
      provider: 'yandex-ai-studio',
      model: 'yandexgpt-lite',
      draft: text,
      publication: false
    })
  } catch (_error) {
    return response.status(504).json({ error: 'yandex_ai_timeout', detail: 'The model request did not complete in time.' })
  }
}
