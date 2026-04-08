# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Команды

```bash
# Разработка
npm run start:dev        # Запуск с hot-reload (использует .env.dev)
npm run migrate:dev      # Применить миграции Prisma (использует .env.dev)
npm run seed             # Заполнить БД тестовыми данными (использует .env.dev)
npm run studio:dev       # Открыть Prisma Studio

# Сборка и линтинг
npm run build
npm run lint

# Тесты
npm test                 # Все unit-тесты
npm run test:e2e         # E2E тесты
npm run test:watch       # Watch-режим
```

Все dev-команды требуют `NODE_ENV=dev` — файл окружения `.env.dev` (не `.env`).

### Сброс и пересев БД (dev)

```bash
npx prisma migrate reset   # Дропает схему и повторно применяет миграции
npm run seed               # Заполняет БД данными заново
```

## Архитектура

**NestJS + Prisma (PostgreSQL).** Платформа для онлайн-уроков с ролевым доступом.

### Файлы окружения
- `.env.dev` — локальная разработка (DATABASE_URL, JWT_SECRET и др.)
- `prisma.config.ts` — читает env в зависимости от `NODE_ENV`, используется Prisma CLI

### Auth
- `POST /auth/register` и `POST /auth/login` — публичные маршруты.
- Все остальные маршруты проходят через `AuthMiddleware` (JWT Bearer), который кладёт `req.user` с payload `{ sub, email, role }`.
- Ролевой доступ: декоратор `@Roles(Role.X)` + `RolesGuard` на маршруте. Guard читает `req.user` из middleware.
- Поле `role` в JWT payload соответствует полю `baseRole` модели User.

### Prisma клиент
- Генерируется в `prisma/generated/prisma/` (нестандартный путь вывода).
- Энумы импортировать из `prisma/generated/prisma/enums`, не из `@prisma/client`.
- Namespace `Prisma` импортировать из `prisma/generated/prisma/client` (нужен для типов вроде `Prisma.InputJsonValue`).
- `PrismaModule` глобальный — `PrismaService` можно инжектить в любой модуль без повторного импорта.
- Драйвер: `@prisma/adapter-pg` с `PrismaPg` — поле `url` в datasource отсутствует, соединение через `Pool`.
- `moduleFormat = "cjs"` в генераторе — важно для совместимости с NestJS.

### Модель User
Поля были переименованы при рефакторинге:
- `id` — cuid String (было Int autoincrement)
- `passwordHash` (было `password`)
- `displayName` (было `name`)
- `baseRole: Role` (было `role`)
- `status: UserStatus` — enum: `ACTIVE` | `PENDING` | `CANCELLED`, default `ACTIVE`
- `preferredLang: Lang` — enum: `EN` | `RU` | `UA`, default `EN`

### Роли
`OWNER` → `ADMINISTRATOR` → `REVISIONER` → `TEACHER` → `STUDENT`

- **OWNER** — назначает администраторов, может всё что ADMINISTRATOR
- **ADMINISTRATOR** — approve/reject кандидатов, публикация и откат версий урока
- **REVISIONER** — просмотр уроков, создание edit candidates (предложения правок)
- **TEACHER** — ведёт урок (будущий runtime), просмотр уроков только на чтение
- **STUDENT** — потребляет урок (будущий runtime)

### Схема БД — модели

| Модель | Назначение |
|---|---|
| `User` | Пользователи платформы |
| `AppSession` | JWT-сессии с возможностью переключения роли |
| `EditCandidate` | Предложения правок контента (ожидают review) |
| `PublishVersion` | Опубликованные снапшоты версий урока |
| `AuditEvent` | Лог всех значимых действий |
| `Lesson` | Метаданные урока; `id` = код урока, напр. `"1A"`, `"13A"` |
| `Scene` | Сцены урока; уникальны по `(lessonId, sceneKey)` |
| `Step` | Шаги урока; уникальны по `(lessonId, stepKey)` |

### Контент уроков
- 25 уроков (`1A`–`12B` + `13A`), источник: `data/SERVER/lesson_*_runtime.json`
- Многоязычные поля (`title`, `prompt`, `explanation`) хранятся как `Json` с ключами `ru`, `en`, `uk`
- `Step.correctAnswer: Json?` — строка для `single_choice`, массив строк для `multi_choice`
- `Step.options: Json?` — массив `{ id, text: { ru, en, uk } }`
- `Step.imagePath` — относительный путь к изображению из `step_image_map` в JSON-файле

### Seed (`prisma/seed.ts`)
Сидирует в два этапа:
1. **7 пользователей** — по одному на каждую роль (OWNER, ADMINISTRATOR, REVISIONER, TEACHER×2, STUDENT×2)
2. **25 уроков** — читает все `_runtime.json` из `data/SERVER/`, upsert Lesson → Scene → Step

Вспомогательная функция `toJson()` очищает `undefined`-значения через `JSON.parse(JSON.stringify())` перед передачей в pg-адаптер.

### Запланированные модули (не реализованы)
- `lesson` — REST API для CRUD уроков/сцен/шагов (ADMINISTRATOR, REVISIONER)
- `session` — Live-сессии, WebSocket gateway (TEACHER управляет слайдами, STUDENT получает)
- `organization` — Мультитенантность для франчайзи
