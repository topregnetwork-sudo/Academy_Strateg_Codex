function chatId(value) {
  const id = String(value || '')
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) throw new Error('HH_CHAT_ID_INVALID')
  return id
}

function projectChat(item) {
  const unread = Number(item.unread_message_count)
  if (!Number.isSafeInteger(unread) || unread < 0) throw new Error('HH_CHAT_UNREAD_INVALID')
  return { chatId: chatId(item.id), type: String(item.type || ''),
    unreadCount: unread, lastMessageId: item.last_message?.id ? String(item.last_message.id) : null }
}

function projectParticipants(result) {
  if (!Array.isArray(result.items)) throw new Error('HH_CHAT_PARTICIPANTS_INVALID')
  return result.items.map(item => ({ participantId: chatId(item.id), role: String(item.role || ''),
    resumeId: item.resume_id ? String(item.resume_id) : null,
    lastViewedMessageId: item.last_viewed_message_id ? String(item.last_viewed_message_id) : null }))
}

async function inventoryChats({ api, token, vacancyIds, maxPages = 50 }) {
  if (!Array.isArray(vacancyIds) || vacancyIds.length < 1 || vacancyIds.length > 100 ||
      vacancyIds.some(id => !/^\d+$/.test(String(id)))) throw new Error('HH_CHAT_VACANCY_SCOPE_INVALID')
  const filter = encodeURIComponent(`[${vacancyIds.join(',')}]`)
  const chats = []
  let pages = 1
  for (let page = 0; page < pages; page++) {
    if (page >= maxPages) throw new Error('HH_CHAT_PAGE_BOUND_EXCEEDED')
    const result = await api.get(`/common/chats?page=${page}&per_page=20&filter_with_vacancy_ids=${filter}&host=hh.ru`,
      token, '/common/chats')
    if (!Array.isArray(result.items) || result.page !== page || !Number.isInteger(result.pages) ||
        result.pages < 1 || result.pages > maxPages) throw new Error('HH_CHAT_PAGE_INVALID')
    pages = result.pages
    chats.push(...result.items.map(projectChat))
  }
  return { chats, pagesRead: pages }
}

async function probeNoViewed({ api, token, vacancyIds, candidateChatId }) {
  const id = chatId(candidateChatId)
  const before = await inventoryChats({ api, token, vacancyIds })
  const chatBefore = before.chats.find(x => x.chatId === id)
  if (!chatBefore) throw new Error('HH_CHAT_PROBE_NOT_IN_INVENTORY')
  const participantsBefore = projectParticipants(await api.get(`/common/chats/${id}/participants?host=hh.ru`,
    token, `/common/chats/${id}/participants`))
  const unreadBefore = await api.get('/common/chats/counters/unread?host=hh.ru', token, '/common/chats/counters/unread')
  const messages = await api.get(`/common/chats/${id}/messages?limit=1&order=prev&host=hh.ru`,
    token, `/common/chats/${id}/messages`)
  if (!Array.isArray(messages.messages)) throw new Error('HH_CHAT_MESSAGES_INVALID')
  const messageRowsObserved = messages.messages.length
  const participantsAfter = projectParticipants(await api.get(`/common/chats/${id}/participants?host=hh.ru`,
    token, `/common/chats/${id}/participants`))
  const unreadAfter = await api.get('/common/chats/counters/unread?host=hh.ru', token, '/common/chats/counters/unread')
  const after = await inventoryChats({ api, token, vacancyIds })
  const chatAfter = after.chats.find(x => x.chatId === id)
  const stable = chatAfter && chatBefore.unreadCount === chatAfter.unreadCount &&
    chatBefore.lastMessageId === chatAfter.lastMessageId &&
    String(unreadBefore.unread_chats_count) === String(unreadAfter.unread_chats_count) &&
    JSON.stringify(participantsBefore) === JSON.stringify(participantsAfter)
  if (!stable) throw new Error('HH_CHAT_VIEWED_EFFECT_UNPROVEN')
  return { messageRowsObserved, viewedEffect: 'not_observed', messagesStored: 0, sends: 0 }
}

module.exports = { chatId, projectChat, projectParticipants, inventoryChats, probeNoViewed }
