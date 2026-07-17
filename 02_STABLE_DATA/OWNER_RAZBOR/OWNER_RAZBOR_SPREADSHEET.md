# OWNER/RAZBOR Spreadsheet

## [РЕШЕНИЕ]

Owner/razbor слой хранится в отдельной таблице:

```text
AS-OWNER-RAZBOR-MVP__OWNERS_RAZBORY_SELLERS
```

Spreadsheet ID:

```text
1vTx2jiibH4rDNRkIBfMv-mRKG2zYXI08W7r2uujYhPA
```

URL:

```text
https://docs.google.com/spreadsheets/d/1vTx2jiibH4rDNRkIBfMv-mRKG2zYXI08W7r2uujYhPA/edit?gid=0#gid=0
```

Назначение:

собственники бизнеса, квалификация, разборщики, доступность, слоты, записи, напоминания, комментарии после разбора, подсказки продавцам, подготовка продажи обзорного курса стратегического управления за 60 000 рублей.

## [БОТЫ]

OWNER_RAZBOR_BOT:

```text
@Akademya_Strateg_bot
```

SELLER_RAZBOR_BOT для MVP:

```text
@Akademya_Strateg_bot
```

Решение MVP: один Telegram bot, но роли owner/seller разделяются по `telegram_chat_id`, `telegram_username`, командам, состояниям и таблицам.

## [РАЗБОРЩИК MVP]

```text
seller_id: seller_001
ФИО: Максим Шипунов
telegram_username: @TopregStrateg
роль: эксперт Академии Стратег
статус: active
meeting_provider: Zoom
часовой_пояс: Europe/Moscow
max_разборов_в_день: 5
```

Zoom-ссылка хранится в таблице `Разборщики.zoom_link` и не должна хардкодиться в workflow.

## [BRIDGE]

Обязательный мост:

```text
business_test_result webhook
-> новая owner/razbor таблица
-> owner_id
-> secure deep-link token
-> bot_link
-> сайт показывает кнопку "Получить разбор результата"
```

Целевой формат:

```text
https://t.me/Akademya_Strateg_bot?start=r_<secure_token>
```

В URL нельзя передавать телефон, email, ФИО, результат теста, webhook token и btm_id в открытом виде, если можно избежать.

## [ЗАПРЕТ]

- Не смешивать owner/razbor данные со старой таблицей Бэтманов без отдельного решения.
- Не переносить сюда `Ссылки_Бэтманов`.
- Не переносить сюда `БизнесТест_Переходы`.
- Не менять текущий webhook бизнес-теста без отдельного решения.
- Не хранить Telegram token, n8n API key и webhook token в проектных файлах.
