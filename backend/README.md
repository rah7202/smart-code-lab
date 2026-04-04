# Smart Code Lab — Backend

Express + TypeScript API server with Socket.IO real-time collaboration, Gemini AI integration, PostgreSQL via Prisma, and Redis for scalable state management.

---

## File Structure

```
backend/
├── prisma/
│   ├── schema.prisma               # Database models (User, Room, CodeSnapshot, AIMessage)
│   └── migrations/                 # Auto-generated migration files
├── src/
│   ├── index.ts                    # Entry point — Redis connect → HTTP server → Socket.IO
│   ├── app.ts                      # Express config — CORS, Helmet, rate limiters, routes
│   ├── controllers/
│   │   ├── ai.controller.ts        # AI generate (batch + SSE stream) + history CRUD
│   │   ├── auth.controller.ts      # Signup + Signin
│   │   ├── codeSnapshot.controller.ts  # Save + list snapshots
│   │   ├── compile.controller.ts   # Judge0 code compilation proxy
│   │   └── room.controller.ts      # Room CRUD + save code
│   ├── services/
│   │   ├── ai.service.ts           # Gemini batch + streaming (AsyncGenerator)
│   │   ├── auth.service.ts         # Bcrypt hash + JWT sign
│   │   ├── codeSnapshot.service.ts # Deduplicated snapshot saves
│   │   ├── judge0.service.ts       # Judge0 API proxy
│   │   └── room.service.ts         # Room creation + lookup
│   ├── middleware/
│   │   ├── auth.middleware.ts      # JWT verification middleware
│   │   └── validate.ts             # Zod schemas + validation middleware
│   ├── routes/
│   │   ├── ai.route.ts             # /api/ai/*
│   │   ├── auth.route.ts           # /api/auth/*
│   │   ├── codeSnapshot.routes.ts  # /api/snapshot/*
│   │   ├── compile.route.ts        # /api/compile
│   │   └── room.route.ts           # /api/room/*
│   ├── sockets/
│   │   └── socket.ts               # Socket.IO — Redis adapter, JWT auth, room events
│   ├── db/
│   │   ├── prisma.ts               # PrismaClient singleton
│   │   └── redis.ts                # Redis client + subscriber pair
│   ├── types/
│   │   └── index.ts                # Shared TypeScript types
│   ├── utils/
│   │   └── logger.ts               # Structured JSON logger
│   └── __tests__/
│       ├── app.test.ts             # Integration: health, CORS, rate-limit, helmet
│       ├── envSetup.ts             # Test environment variables
│       ├── controllers/
│       │   ├── ai.controller.test.ts
│       │   └── compile.controller.test.ts
│       ├── middleware/
│       │   └── validate.middleware.test.ts
│       └── services/
│           ├── ai.service.test.ts
│           ├── codeSnapshot.service.test.ts
│           ├── judge0.service.test.ts
│           └── room.service.test.ts
├── .env.local
├── jest.config.ts
├── package.json
└── tsconfig.json
```

---

## Architecture

### Request Flow

```
Client Request
      │
      ▼
 Helmet (security headers)
      │
      ▼
 CORS (origin allowlist)
      │
      ▼
 Rate Limiter (global: 100/min, AI: 10/min)
      │
      ▼
 Body Parser (50KB limit)
      │
      ▼
 authenticate middleware (JWT verify)
      │
      ▼
 validate middleware (Zod schema)
      │
      ▼
 Controller → Service → Prisma/Redis
      │
      ▼
 JSON Response
```

### Socket.IO Flow

```
WebSocket Handshake
      │
      ▼
 JWT Middleware (socket.handshake.auth.token)
      │
      ▼
 io.on("connection")
      │
      ├── "join"           → validate room exists → add user to Redis → broadcast users list
      ├── "content-edited" → store in Redis → broadcast to room
      ├── "cursor-move"    → enrich with username/color from Redis → broadcast to room
      └── "disconnect"     → remove from Redis → broadcast updated users list
```

### Redis Architecture

Room state is stored entirely in Redis, enabling horizontal scaling via the `@socket.io/redis-adapter`:

```
Redis Keys:
  socket:{socketId}:room          → String  (maps socket to room)
  room:{roomId}:users             → Hash    (socketId → user JSON)
  room:{roomId}:content           → String  (serialized {code, language})
```

When multiple backend instances run, Socket.IO events are pub/sub'd across all instances via the Redis adapter — any user in any room receives updates regardless of which server they're connected to.

---

## Setup

### Prerequisites

- Node.js ≥ 20
- PostgreSQL (local or Neon)
- Redis (local or Render)
- Gemini API Key from [Google AI Studio](https://aistudio.google.com/apikey)

### Installation

```bash
npm install
```

### Environment Variables

Create `.env.local`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/smartcodelab"
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_jwt_secret_minimum_64_chars
ALLOWED_ORIGINS=http://localhost:5173
REDIS_URL=redis://localhost:6379
LOG_LEVEL=debug
NODE_ENV=development
```

| Variable          | Required | Description                                              |
| ----------------- | -------- | -------------------------------------------------------- |
| `DATABASE_URL`    | ✅       | PostgreSQL connection string                             |
| `GEMINI_API_KEY`  | ✅       | Google Gemini API key                                    |
| `JWT_SECRET`      | ✅       | Secret for signing JWT tokens (min 64 chars recommended) |
| `ALLOWED_ORIGINS` | ✅       | Comma-separated allowed CORS origins                     |
| `REDIS_URL`       | ✅       | Redis connection string                                  |
| `LOG_LEVEL`       | ❌       | `debug` / `info` / `warn` / `error`                      |
| `NODE_ENV`        | ❌       | `development` / `production` / `test`                    |

### Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Open Prisma Studio
npx prisma studio
```

### Scripts

| Script                    | Command                                               | Description                      |
| ------------------------- | ----------------------------------------------------- | -------------------------------- |
| `npm run dev`             | `ts-node-dev --respawn --transpile-only src/index.ts` | Start dev server with hot reload |
| `npm run build`           | `tsc`                                                 | Compile TypeScript to `dist/`    |
| `npm start`               | `node dist/index.js`                                  | Start production server          |
| `npm test`                | `jest --coverage`                                     | Run tests with coverage          |
| `npm run prisma:generate` | `prisma generate`                                     | Regenerate Prisma client         |

---

## API Reference

All protected routes require the header:

```
Authorization: Bearer <jwt_token>
```

---

### Authentication

#### `POST /api/auth/signup`

Create a new user account.

**Request body:**

```json
{ "username": "rahul", "password": "mypassword" }
```

**Validation:** username 3–30 chars, password min 6 chars

**Response `201`:**

```json
{ "token": "eyJhbGciOiJIUzI1NiIs..." }
```

---

#### `POST /api/auth/signin`

Sign in with existing credentials.

**Request body:**

```json
{ "username": "rahul", "password": "mypassword" }
```

**Response `200`:**

```json
{ "token": "eyJhbGciOiJIUzI1NiIs..." }
```

---

### Rooms 🔒

#### `GET /api/room/:roomId`

Load room data.

**Response `200`:**

```json
{
  "roomId": "abc-123",
  "language": "javascript",
  "code": "console.log('hello')"
}
```

**Response `404`:** Room not found.

---

#### `POST /api/room/create`

Create a new room (owned by the authenticated user).

**Response `200`:**

```json
{ "roomId": "generated-uuid" }
```

---

#### `POST /api/room/:roomId/save`

Save the current code to the room. Only the room owner can save.

**Request body:**

```json
{ "code": "print('hello')", "language": "python" }
```

**Validation:** `language` must be one of `javascript | python | cpp | c`

**Response `200`:**

```json
{ "success": true }
```

**Response `403`:** Not the room owner.

---

### Code Execution 🔒

#### `POST /api/compile`

Execute code via the Judge0 API.

**Request body:**

```json
{
  "code": "print('hello')",
  "userLangId": 71,
  "input": ""
}
```

| Field        | Type   | Description                                         |
| ------------ | ------ | --------------------------------------------------- |
| `code`       | string | 1–50,000 chars                                      |
| `userLangId` | number | Judge0 language ID (63=JS, 71=Python, 54=C++, 50=C) |
| `input`      | string | Optional stdin, max 10,000 chars                    |

**Response `200`:**

```json
{
  "output": "hello\n",
  "status": { "id": 3, "description": "Accepted" },
  "time": "0.01"
}
```

---

### AI 🔒 (Rate limited: 10 req/min per IP)

#### `POST /api/ai/generate`

Generate AI response as a complete batch response.

**Request body:**

```json
{ "prompt": "Explain this code...", "roomId": "abc-123" }
```

**Response `200`:**

```json
{ "success": true, "data": "## 🔍 Explanation\nThis code..." }
```

Saves both the user prompt and AI response to `AIMessage` table.

---

#### `POST /api/ai/stream`

Stream AI response via Server-Sent Events (SSE).

Same request body as `/generate`. Response is a chunked stream:

```
data: {"chunk":"## 🔍 "}

data: {"chunk":"Explanation\n"}

data: {"chunk":"This code does..."}

data: {"done":true}
```

Each chunk is a JSON-encoded object on a `data:` line, separated by `\n\n`.

---

#### `GET /api/ai/history/:roomId`

Get all AI chat messages for a room, ordered by `createdAt asc`.

**Response `200`:**

```json
[
  {
    "id": "...",
    "role": "user",
    "content": "Explain this",
    "createdAt": "..."
  },
  { "id": "...", "role": "ai", "content": "## 🔍 ...", "createdAt": "..." }
]
```

---

#### `DELETE /api/ai/history/:roomId`

Clear all AI chat history for a room.

**Response `200`:**

```json
{ "success": true }
```

---

### Snapshots 🔒

#### `POST /api/snapshot/:roomId`

Save a code snapshot (version checkpoint). Skips save if code and language are identical to the last snapshot.

**Request body:**

```json
{ "code": "print('hi')", "language": "python" }
```

**Response `201`:**

```json
{ "id": "snapshot-uuid", "createdAt": "2026-04-04T10:00:00Z" }
```

---

#### `GET /api/snapshot/:roomId`

Get all snapshots for a room, ordered newest first.

**Response `200`:**

```json
[{ "id": "...", "code": "...", "language": "python", "createdAt": "..." }]
```

---

## Socket.IO Events

Connection requires a JWT token in the socket handshake:

```typescript
const socket = io("http://localhost:8000", {
  auth: { token: localStorage.getItem("token") },
  transports: ["websocket"],
});
```

### Client → Server

| Event            | Payload                              | Description                                            |
| ---------------- | ------------------------------------ | ------------------------------------------------------ |
| `join`           | `{ RoomId: string }`                 | Join a room — triggers user list broadcast + code sync |
| `content-edited` | `{ code: string, language: string }` | Broadcast code changes to room on every keystroke      |
| `cursor-move`    | `{ line: number, column: number }`   | Broadcast cursor position to room                      |

### Server → Client

| Event            | Payload                                       | Description                                       |
| ---------------- | --------------------------------------------- | ------------------------------------------------- |
| `users`          | `User[]`                                      | Updated user list `{ username, color, socketId }` |
| `code-sync`      | `string`                                      | Initial code sync when a user joins a room        |
| `content-edited` | `{ code, language }`                          | Code update from a collaborator                   |
| `cursor-move`    | `{ line, column, username, color, socketId }` | Cursor position from a collaborator               |
| `error`          | `string`                                      | Error message (e.g., `"Room does not exist"`)     |

---

## Database Schema

```prisma
model User {
  id        String   @id @default(uuid())
  username  String   @unique
  password  String
  createdAt DateTime @default(now())
  rooms     Room[]
}

model Room {
  id        String        @id @default(uuid())
  language  String
  code      String        @db.Text
  createdAt DateTime      @default(now())
  userId    String
  user      User          @relation(fields: [userId], references: [id])
  snapshots CodeSnapshot[]
  aiMessages AIMessage[]
  @@index([userId])
}

model CodeSnapshot {
  id        String   @id @default(uuid())
  roomId    String
  room      Room     @relation(fields: [roomId], references: [id])
  code      String   @db.Text
  language  String
  createdAt DateTime @default(now())
  @@index([roomId])
}

model AIMessage {
  id        String   @id @default(uuid())
  roomId    String
  room      Room     @relation(fields: [roomId], references: [id])
  role      String   // "user" | "ai"
  content   String   @db.Text
  createdAt DateTime @default(now())
  @@index([roomId])
}
```

**Relationships:**

```
User (1) ──→ (N) Room
Room (1) ──→ (N) CodeSnapshot
Room (1) ──→ (N) AIMessage
```

---

## Security

| Layer                | Implementation                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| **Authentication**   | JWT tokens (7-day expiry) — `jsonwebtoken` + `bcrypt` password hashing                           |
| **Authorization**    | `authenticate` middleware on all protected routes + room owner checks                            |
| **Input Validation** | Zod schemas on all mutation endpoints — invalid requests return `400` before hitting controllers |
| **Rate Limiting**    | Global: 100 req/min per IP — AI routes: additional 10 req/min per IP                             |
| **CORS**             | Origin allowlist from `ALLOWED_ORIGINS` — rejects all unlisted origins                           |
| **Security Headers** | Helmet (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, etc.)                                |
| **Body Limit**       | 50KB JSON body limit                                                                             |
| **Socket Auth**      | JWT verification on WebSocket handshake before any room events are processed                     |

---

## Testing

**Framework:** Jest + Supertest + ts-jest

```bash
# Run all tests with coverage
npm test

# Coverage thresholds: 70% lines, 70% functions
```

Test environment variables are set in `src/__tests__/envSetup.ts` — `JWT_SECRET`, `NODE_ENV=test`, and `DATABASE_URL` are all provided so no real database is needed (Prisma is mocked).

| Test File                      | What it Tests                                                         |
| ------------------------------ | --------------------------------------------------------------------- |
| `app.test.ts`                  | Health check, CORS allowlist/rejection, rate limiting, Helmet headers |
| `ai.controller.test.ts`        | Generate, stream, history CRUD — Prisma and AI service mocked         |
| `compile.controller.test.ts`   | Judge0 proxy — accepted/error/timeout cases                           |
| `validate.middleware.test.ts`  | All Zod schemas — valid inputs, edge cases, enum rejection            |
| `ai.service.test.ts`           | Gemini SDK mock — prompt validation, error propagation                |
| `codeSnapshot.service.test.ts` | Deduplication logic, DB create/find                                   |
| `judge0.service.test.ts`       | Judge0 API proxy — response parsing                                   |
| `room.service.test.ts`         | Room CRUD — create, find, authorization                               |
