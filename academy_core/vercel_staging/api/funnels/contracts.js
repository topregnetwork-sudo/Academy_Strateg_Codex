const contracts = [
  {
    funnel_id: "batman", title: "Batman", status: "RECOVERED_LOCAL_NOT_CONNECTED",
    stages: ["Анкета", "Zoom-слот", "Вводная группа", "Запрос ссылки", "Личная витрина", "Распространение", "Подтверждённый результат"],
    identities: ["HR-*", "btm_id"],
    capabilities: ["link_requested", "personal_hub", "event_share_kit", "business_test_main", "team_invite"],
    external: ["Telegram — адаптер", "VK — адаптер сообщества", "Zoom", "Google Forms/Sheets — только источник миграции"],
    preserved: ["Zoom click не равен присутствию", "Запрос ссылки является действием и запускает автоматическую активацию", "share.opened не равен публикации", "Результат считается по внешнему событию"],
  },
  {
    funnel_id: "owner", title: "Owner", status: "RECOVERED_LOCAL_NOT_CONNECTED",
    stages: ["Вход по целевой ссылке", "Регистрация на мероприятие и/или тест", "Бизнес-тест", "Мероприятие", "Предразбор", "Квалификация", "Разбор", "Оффер", "Оплата", "Доступ", "Завершение курса"],
    identities: ["owner_id", "btm_id_referrer", "event_registration_id", "test_registration_id", "result_id"],
    capabilities: ["event.registered", "business_test.registered", "business_test.completed", "event.attended", "course.completed"],
    external: ["Telegram — адаптер", "бизнес-тест — адаптер", "Zoom", "Google Sheets — только источник миграции"],
    preserved: ["Первый источник не перезаписывается", "Результаты версионируются", "Разбор, оплата и доступ требуют подтверждения"],
  },
  {
    funnel_id: "events", title: "Мероприятия", status: "SYNTHETIC_VERTICAL_AVAILABLE",
    stages: ["Черновик", "Проверено организатором", "Опубликовано", "Регистрация", "Напоминание", "Посещение", "Следующий маршрут"],
    identities: ["event_id", "campaign_id", "btm_id_referrer", "owner_id"],
    capabilities: ["event_catalog", "event_share_kit", "event.registered", "event.attended", "speaker_read_model"],
    external: ["Публичные страницы", "VK — источник/адаптер", "Telegram — адаптер", "AI Gateway — адаптер"],
    preserved: ["Событие без даты не публикуется как подтверждённое", "Генерация всегда создаёт черновик", "Спикер видит минимально необходимый набор данных"],
  },
  {
    funnel_id: "trainer", title: "Trainer", status: "PRESERVED_SEPARATE_FUNNEL",
    stages: ["Существующая утверждённая Trainer-воронка"],
    identities: ["candidate_id"], capabilities: ["trainer_funnel"],
    external: ["Действующий Trainer-контур"],
    preserved: ["Не объединять с Batman или Owner", "Не изменять действующую воронку из этого стенда"],
  },
];

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });
  return res.status(200).json({
    environment: "synthetic_staging_only", external_actions_enabled: false,
    personal_data_allowed: false, storage_decision: "russian_production_required_not_selected",
    document_storage_candidate: "Yandex Disk — requires access/backup/restore validation", contracts,
  });
}
