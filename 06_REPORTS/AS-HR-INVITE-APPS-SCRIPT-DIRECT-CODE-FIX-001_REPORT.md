# AS-HR-INVITE-APPS-SCRIPT-DIRECT-CODE-FIX-001 — отчёт

Дата: 2026-07-17 (Europe/Moscow).

## [ЧТО ДОСТУПНО]

- Передан Apps Script project id: `1l5yny3So7Ybyq-6SSqhPd3T0iIVZwXMb-QP0p4ZTphB6wBVv-vixdU7u`.
- Найден локальный экспорт исходника: `06_REPORTS/UNSORTED_TEXT_IMPORT/рабочий код 3000 28.06.26.txt`.
- Экспорт содержит 542 строки и 17 функций.
- Найдены локальные материалы `AS_Team_Recruiting_Hub`, включая правила атрибуции и постоянной `hr_invite`.
- Подтверждён spreadsheet id реестра: `1elth69RYkIVd0nTqgsoR0r1ZWJyYZG2WOObzH5kAw08`.

Автоматизированная Google-сессия не авторизована: прямое открытие переданного Apps Script project id перенаправляет на общую страницу Apps Script. Поэтому live-файлы и название live-проекта не прочитаны, а локальный экспорт не объявляется идентичным текущему live-коду.

## [ЧТО ЗАПРОШЕНО У ПОЛЬЗОВАТЕЛЯ]

Получен идентификатор проекта. Пароли, токены, n8n API key, Telegram token, Google credentials и доступ ко всему Drive не запрашивались.

Для фактической live-правки остаётся нужен редакторский доступ именно к этому Apps Script в авторизованной управляемой сессии. Отдельный доступ к таблице для массовых изменений не запрашивается.

## [BACKUP СОЗДАН]

Создан backup доступного локального экспорта:

`C:\Users\admin\Downloads\AS_Team_Recruiting_Hub\backups\apps_script_hr_invite_generator\20260717_030027\`

Сохранены:

- `Code_local_source_before_hr_invite_fix.gs`;
- `BACKUP_METADATA.txt`.

Статус backup явно помечен как `local_export_unverified_against_live`. Live-backup нельзя считать выполненным, пока live-код не прочитан.

Доступный локальный файл содержит функции:

`doGet`, `AS_BTM_renderRedirectPage_`, `AS_BTM_renderError_`, `AS_BTM_buildBusinessTestFinalUrl_`, `AS_BTM_safeLogBusinessTestClick_`, `AS_BTM_UPDATE_BUSINESS_TEST_MAIN_URLS`, `AS_BTM_TOP_UP_LINKS_IF_NEEDED`, `AS_BTM_buildHrInviteUrl_`, `AS_BTM_makeLinkRow_`, `AS_BTM_INSTALL_HOURLY_TOP_UP_TRIGGER`, `AS_BTM_AFTER_DEPLOY_RUN_ONCE`, `AS_BTM_TEST_FINAL_BUSINESS_TEST_URL`, `AS_BTM_TEST_WEBAPP_LINK`, `AS_BTM_TEST_HR_INVITE_URL`, `AS_BTM_buildUrl_`, `AS_BTM_escapeHtml_`, `AS_BTM_getHeaderMap_`.

## [ФУНКЦИЯ HR_INVITE НАЙДЕНА]

В локальном экспорте функция `AS_BTM_buildHrInviteUrl_(btmId)` строит прямой prefilled URL на Google Form через `AS_BTM_CONFIG.HR_FORM_URL` и поля `entry.*`.

`AS_BTM_TOP_UP_LINKS_IF_NEEDED()` создаёт пары строк:

- `btm_XXXXXX_business_test_main`;
- `btm_XXXXXX_hr_invite`.

Для `hr_invite` URL берётся только из `AS_BTM_buildHrInviteUrl_(btmId)`.

## [ФУНКЦИЯ BUSINESS_TEST_MAIN НЕ ТРОНУТА]

Логика `AS_BTM_buildBusinessTestFinalUrl_`, `AS_BTM_UPDATE_BUSINESS_TEST_MAIN_URLS`, business-test Web App и существующие 3000 `business_test_main` не изменялись.

Подготовленный diff содержит `business_test_main` только в комментарии-запрете.

## [КАКАЯ ПРАВКА ПОДГОТОВЛЕНА]

Файл: `tools/apps_script_hr_invite_generator/Generator_HrInvite_Patch.gs`.

Минимальная замена только тела `AS_BTM_buildHrInviteUrl_`:

- валидирует `btm_id` по формату `btm_XXXXXX`;
- читает Router URL из свойства `HR_INVITE_ROUTER_URL`;
- формирует постоянный URL `ROUTER_URL?link_id=btm_XXXXXX_hr_invite`;
- не меняет `link_id`, `btm_id` и `type`;
- безопасно останавливает генерацию новых `hr_invite`, если Router URL не настроен.

Production-код не изменён.

## [SMART LINK ROUTER]

Отдельного готового Router в локальном Hub не найдено. Подготовлен отдельный Apps Script Web App:

`tools/apps_script_hr_invite_generator/SmartLinkRouter.gs`.

Router:

- принимает только `link_id=btm_XXXXXX_hr_invite`;
- извлекает `btm_id` и `link_type` без изменения идентификаторов;
- создаёт `click_id`;
- строит target:
  `index.html?ref=btm_XXXXXX&source_id=hr_invite&link_type=hr_invite&click_id=...`;
- пишет журнал только в отдельную таблицу по `ROUTER_LOG_SPREADSHEET_ID`;
- не использует HR-Zoom;
- не содержит n8n, Telegram или credentials;
- не показывает публично термин «Бэтман».

Нужны два свойства будущего Router-проекта:

- `RECRUITING_HUB_BASE_URL`;
- `ROUTER_LOG_SPREADSHEET_ID`.

Router не развёрнут: deploy отдельно запрещён без подтверждения.

## [ТЕСТ НА ОДНОЙ СТРОКЕ]

Подготовлены helpers:

`tools/apps_script_hr_invite_generator/One_Row_Test_And_Rollback.gs`.

Они:

- принимают только точный `link_id` формата `btm_XXXXXX_hr_invite`;
- требуют ровно одно совпадение;
- сохраняют старый и новый URL в Script Properties;
- меняют только одну ячейку `URL / формула`;
- проверяют `link_id` перед откатом;
- не содержат массовой миграции.

Live-тест не запускался: Router не развёрнут, Hub не имеет подтверждённого публичного URL, а текущая автоматизированная Google-сессия не имеет editor-доступа.

Локальные тесты пройдены:

- синтаксис всех трёх `.gs` файлов — PASS;
- валидный `link_id` разбирается — PASS;
- `business_test_main` Router отклоняет — PASS;
- target URL сохраняет `ref/source_id/link_type/click_id` — PASS;
- генератор создаёт только `?link_id=btm_001001_hr_invite` — PASS;
- неверный `btm_id` отклоняется — PASS.

## [ПЛАН ОТКАТА]

1. До live-правки выгрузить полный текущий Apps Script-проект и сверить его с локальным экспортом.
2. Для тестовой строки сохранить старый URL до записи.
3. При любой ошибке вызвать `AS_BTM_ROLLBACK_ONE_HR_INVITE_TEST()`.
4. Проверить восстановление исходного URL и отсутствие второй изменённой строки.
5. Не переходить к миграции 3000 строк без нового решения.

## [ЧТО НЕ ТРОГАЛИ]

- live Apps Script;
- Google Sheets и 3000 строк;
- `business_test_main`;
- `AS-BOT__00_MAIN_ROUTER`;
- любые n8n workflow;
- существующую HR-форму;
- HR-Zoom;
- Telegram;
- credentials, webhook URL и секреты;
- публикацию `AS_Team_Recruiting_Hub`.

## [РИСКИ]

- Локальный экспорт может отличаться от live-кода.
- Публичный URL Hub не подтверждён.
- Router deployment URL отсутствует.
- Отдельная таблица журнала Router не создана.
- Apps Script Web App не передаёт HTTP User-Agent в стандартном объекте `doGet(e)`; поле журнала останется пустым, если его не передаст клиентский слой. Это не блокирует атрибуцию по `click_id/link_id/btm_id`.
- Production-проверка редиректа и записи журнала ещё не выполнена.

## [ОДИН СЛЕДУЮЩИЙ ШАГ]

В авторизованной редакторской сессии открыть переданный Apps Script project id, сделать полный live-backup и сверить live-функцию `AS_BTM_buildHrInviteUrl_` с подготовленным минимальным diff. До этой сверки Router не deploy и тестовую строку не менять.

---

[CODEX→CHATGPT]

[ЭТАП]
Read-only аудит и локальная подготовка исправления `hr_invite`.

[ЧТО СДЕЛАНО]
Получен project id, найден локальный экспорт, создан помеченный backup, найдены функции `hr_invite` и `business_test_main`, подготовлены минимальный diff, отдельный Router и одно-строчный тест с откатом. Локальные проверки прошли.

[ЧТО ПОДТВЕРЖДЕНО]
`hr_invite` в доступном исходнике строится как прямая Google Form-ссылка; `business_test_main` — отдельная логика.

[ЧТО ИЗМЕНЕНО]
Только локальные файлы подготовки и `00_CONTROL`. Production не изменён.

[ЧТО НЕ ТРОГАЛИ]
Google Sheets, 3000 строк, live Apps Script, business_test_main, n8n, Telegram, HR-форму, credentials.

[РИСКИ]
Автоматизированная Google-сессия не авторизована; live-код не сверен. Router и Hub ещё не имеют подтверждённых production URL.

[НУЖНО РЕШЕНИЕ]
Да: дать следующее безопасное задание — сначала получить авторизованный editor-доступ и выполнить live-backup/read-only сверку, либо отдельно утвердить создание Router и публичный URL Hub.

[ОДИН СЛЕДУЮЩИЙ ШАГ]
Открыть live Apps Script в авторизованной управляемой сессии и сверить `AS_BTM_buildHrInviteUrl_` без изменений.
