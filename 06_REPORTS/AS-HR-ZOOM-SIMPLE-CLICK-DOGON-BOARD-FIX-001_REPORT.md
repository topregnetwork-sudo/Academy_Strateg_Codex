# AS-HR-ZOOM-SIMPLE-CLICK-DOGON-BOARD-FIX-001_REPORT

## [ПОДТВЕРЖДЕНО]
- HR-0107: в `Кандидаты_HR` есть старый `zoom_click_at = 2026-07-07T12:24:21.730Z`, но `zoom_click_valid_at_msk` пустой.
- Первая доска показывала Zoom из старой логики `фактическое_время_подключения_Zoom / статус_Zoom`, а вторая доска смотрела на `zoom_click_valid_at_msk`.
- Dogon execution 342 в 08:10 Мск прочитал HR-0107, но старый dogon-фильтр вернул 0 кандидатов из-за хрупкого расчёта целевого слота.
- Host brief падал из-за строки `ВСТАВИТЬ_CHAT_ID`; group chat_id найден в execution `/brief_test`: `-5437627147`.
- Chat_id Сергея `@any_wishes` не найден.

## [ИСПРАВЛЕНО]
- `AS-HR-ZOOM-MVP__03_ZOOM_CLICK_REDIRECT`: время Zoom теперь пишется только при валидном окне клика.
- `AS-HR-ZOOM-MVP__SCHEDULED_ZOOM_EVENTS`: dogon-фильтр теперь считает `+10 минут` от времени Zoom в строке кандидата, без жёсткой карты слотов.
- `AS-HR-ZOOM-MVP__SCHEDULED_ZOOM_EVENTS`: host brief дедуплицирует получателей и игнорирует нечисловые chat_id.
- `Доска прогресса`: колонка `Zoom время входа` смотрит на `zoom_click_valid_at_msk`.
- `Доска_Прогресса_Клики_Переходы`: колонка `Zoom время входа` показывает `zoom_click_valid_at_msk`; колонка статуса клика очищена от early/valid/late.
- Обе доски: напоминалка зелёная, если есть `статус_напоминания_30мин = отправлено` или `reminder_30min_sent_at`; dogon зелёный, если есть `статус_dogon_10мин = отправлено` или `dogon_10min_sent_at`.
- `Получатели_Сводок`: строка группы обновлена на numeric chat_id `-5437627147`.

## [НЕ ТРОГАЛИ]
- HMAC secret.
- platform webhook.
- business_test_main.
- btm_id.
- старые выключенные 02 и 04.
- Telegram credentials.
- названия листов и исходных колонок `Кандидаты_HR`.
- schedule каждые 5 минут не добавлялся.
- второй Telegram Trigger не создавался.

## [ТЕСТЫ]
- click on time: logic patch установлен; live-проверка возможна на ближайшем реальном Zoom-слоте. Вне валидного окна workflow больше не должен записывать Zoom-время.
- no click + dogon: logic patch установлен; dogon выбирает кандидата по `+10 минут` от Zoom-времени и пустому `zoom_click_valid_at`.
- HR-0107 board sync: `Доска прогресса` = `⚪`, `Доска_Прогресса_Клики_Переходы` = ``.
- host brief: Максим и группа готовы; Сергей не готов, потому что нет numeric `telegram_chat_id`.

## [BACKUP]
- `C:\Users\admin\Downloads\Academy_Strateg_Codex\03_N8N_WORKFLOWS\_LIVE_BACKUP_BEFORE_ZOOM_SIMPLE_CLICK_DOGON_BOARD_FIX\20260714_115729\AS-HR-ZOOM-MVP__03_ZOOM_CLICK_REDIRECT.json`
- `C:\Users\admin\Downloads\Academy_Strateg_Codex\03_N8N_WORKFLOWS\_LIVE_BACKUP_BEFORE_ZOOM_SIMPLE_CLICK_DOGON_BOARD_FIX\20260714_115729\AS-HR-ZOOM-MVP__SCHEDULED_ZOOM_EVENTS.json`
- `C:\Users\admin\Downloads\Academy_Strateg_Codex\03_N8N_WORKFLOWS\_LIVE_BACKUP_BEFORE_ZOOM_SIMPLE_CLICK_DOGON_BOARD_FIX\20260714_115729\GOOGLE_SHEETS_BOARD_FORMULAS_AND_RECIPIENTS_BACKUP.json`

## [СЛЕДУЮЩИЙ ШАГ]
Сергей должен написать боту `/start`, после этого добавить его numeric `telegram_chat_id` в `Получатели_Сводок` и проверить host brief на следующем слоте.
