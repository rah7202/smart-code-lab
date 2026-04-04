# Smart Code Lab

> _Code together. Think faster._

A real-time collaborative code editor with AI-powered assistance. Multiple users can simultaneously write, edit, and debug code in the same room — with live cursor tracking, instant code synchronization, and an AI assistant powered by Google Gemini that streams responses in real-time.

[![CI Pipeline](https://github.com/rah7202/smart-code-lab/actions/workflows/ci.yml/badge.svg)](https://github.com/rah7202/smart-code-lab/actions)

---

## Features

| Feature                        | Description                                                                                                    |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| 🖥️ **Monaco Editor**           | VS Code-quality editor with syntax highlighting, IntelliSense, and custom themes per language                  |
| 👥 **Real-Time Collaboration** | Multiple users edit simultaneously with live cursor positions and colored name badges                          |
| 🤖 **AI Assistant (Gemini)**   | Ask Gemini to explain, review, fix, or optimize your code — responses stream in real-time via SSE              |
| ✂️ **Selection Toolbar**       | Select any code snippet → inline floating toolbar with Explain, Review, Fix, Optimize, and custom Ask actions  |
| ▶️ **Code Execution**          | Run code directly in the browser (Python, JavaScript, C++, C) via Judge0 API                                   |
| 📸 **Version History**         | Automatic snapshots on every run + manual save with one-click restore                                          |
| 🔐 **JWT Authentication**      | Secure signup/signin with bcrypt password hashing and JWT tokens                                               |
| ⚡ **Redis-Backed State**      | Room state, user presence, and code content stored in Redis for horizontal scaling                             |
| 🖱️ **Resizable AI Panel**      | Drag to resize the AI output section for a customized workspace                                                |
| 📥 **Code Download**           | Download your code as a properly named file (e.g., `Rahul-2026-04-04.py`)                                      |
| 🎨 **Custom Themes**           | Each language has its own color-tuned Monaco theme (blue for Python, amber for JS, purple for C++, teal for C) |

---

## Supported Languages

| Language   | Badge | Judge0 ID | Monaco Theme |
| ---------- | ----- | --------- | ------------ |
| JavaScript | `JS`  | 63        | Warm amber   |
| Python     | `PY`  | 71        | Deep blue    |
| C++        | `C++` | 54        | Purple       |
| C          | `C`   | 50        | Teal         |

---

## Architecture

```
┌─────────────────────────────────────┐
│           Frontend (React)          │
│  ┌──────────┐ ┌──────┐ ┌────────┐  │
│  │  Monaco   │ │  AI  │ │Version │  │
│  │  Editor   │ │Panel │ │History │  │
│  └────┬─────┘ └──┬───┘ └───┬────┘  │
│       │          │          │       │
│  ┌────┴──────────┴──────────┴────┐  │
│  │         Hooks Layer           │  │
│  │  useCollaboration             │  │
│  │  useAI (SSE streaming)        │  │
│  │  useEditorPersistence         │  │
│  └────┬──────────┬──────────┬────┘  │
└───────┼──────────┼──────────┼───────┘
        │ WebSocket│ REST/SSE │ REST
        │          │          │
┌───────┼──────────┼──────────┼───────┐
│       │   Backend (Express)  │      │
│  ┌────┴────┐ ┌───┴───┐ ┌───┴────┐  │
│  │Socket.IO│ │  AI   │ │  Room  │  │
│  │ Server  │ │Service│ │Service │  │
│  └────┬────┘ └───┬───┘ └───┬────┘  │
│       │          │          │       │
│  ┌────┴──────────┴──────────┴────┐  │
│  │         Data Layer            │  │
│  │  PostgreSQL       Redis       │  │
│  │  (Prisma ORM)  (state/adapter)│  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

---

## Project Structure

```
smart-code-lab/
├── .github/
│   └── workflows/
│       └── ci.yml               # CI pipeline (GitHub Actions)
├── backend/                     # Express API + Socket.IO server
├── frontend/                    # React + Vite SPA
├── .gitignore
└── README.md
```

---

## Tech Stack

### Frontend

| Technology       | Version | Purpose                           |
| ---------------- | ------- | --------------------------------- |
| React            | 19.2    | UI framework                      |
| Vite             | 8.0     | Build tool & dev server           |
| TypeScript       | 5.9     | Type safety                       |
| TailwindCSS      | 4.2     | Utility-first styling             |
| Monaco Editor    | 4.7     | Code editor (VS Code engine)      |
| Socket.IO Client | 4.8     | Real-time WebSocket communication |
| Axios            | 1.13    | HTTP client with interceptors     |
| React Router DOM | 7.13    | Client-side routing               |
| React Markdown   | 10.1    | AI response rendering             |
| Vitest           | 4.1     | Testing framework                 |
| Testing Library  | 16.3    | Component testing                 |

### Backend

| Technology               | Version | Purpose                           |
| ------------------------ | ------- | --------------------------------- |
| Express                  | 5.2     | Web framework                     |
| TypeScript               | 5.9     | Type safety                       |
| Prisma                   | 5.22    | ORM for PostgreSQL                |
| PostgreSQL               | —       | Primary database                  |
| Redis                    | 5.11    | Session state + Socket.IO adapter |
| Socket.IO                | 4.8     | Real-time WebSocket server        |
| @socket.io/redis-adapter | 8.3     | Multi-server pub/sub              |
| Google Generative AI     | 0.24    | Gemini AI integration             |
| JSON Web Token           | 9.0     | Authentication                    |
| Bcrypt                   | 6.0     | Password hashing                  |
| Zod                      | 4.3     | Request validation                |
| Helmet                   | 8.1     | Security headers                  |
| Express Rate Limit       | 8.3     | Rate limiting                     |
| Jest                     | 30.3    | Testing framework                 |
| Supertest                | 7.2     | HTTP assertion library            |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 20
- **npm** ≥ 9
- **PostgreSQL** (local or hosted, e.g., Neon)
- **Redis** (local or hosted, e.g., Render Redis)
- **Gemini API Key** — [Get one here](https://aistudio.google.com/apikey)

### 1. Clone the Repository

```bash
git clone https://github.com/rah7202/smart-code-lab.git
cd smart-code-lab
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env.local`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/smartcodelab"
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_jwt_secret_here_minimum_64_chars
ALLOWED_ORIGINS=http://localhost:5173
REDIS_URL=redis://localhost:6379
LOG_LEVEL=debug
```

Generate Prisma client and run migrations:

```bash
npx prisma generate
npx prisma migrate dev
```

Start the backend dev server:

```bash
npm run dev
# → Server starts on http://localhost:8000
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

Create `frontend/.env.local`:

```env
VITE_BACKEND_URL=http://localhost:8000
```

Start the frontend dev server:

```bash
npm run dev
# → App opens on http://localhost:5173
```

### 4. Open the App

1. Navigate to `http://localhost:5173`
2. Sign up for an account
3. Create a room or enter an existing Room ID
4. Start coding!

---

## Environment Variables

### Backend (`backend/.env.local`)

| Variable          | Required | Description                                  |
| ----------------- | -------- | -------------------------------------------- |
| `DATABASE_URL`    | ✅       | PostgreSQL connection string                 |
| `GEMINI_API_KEY`  | ✅       | Google Gemini API key                        |
| `JWT_SECRET`      | ✅       | Secret for signing JWT tokens (min 64 chars) |
| `ALLOWED_ORIGINS` | ✅       | Comma-separated allowed CORS origins         |
| `REDIS_URL`       | ✅       | Redis connection string                      |
| `LOG_LEVEL`       | ❌       | Log level (`debug`, `info`, `warn`, `error`) |
| `NODE_ENV`        | ❌       | Environment mode                             |

### Frontend (`frontend/.env.local`)

| Variable           | Required | Description        |
| ------------------ | -------- | ------------------ |
| `VITE_BACKEND_URL` | ✅       | Backend server URL |

---

## Scripts Reference

### Backend

| Script          | Description                      |
| --------------- | -------------------------------- |
| `npm run dev`   | Start dev server with hot reload |
| `npm run build` | Compile TypeScript to `dist/`    |
| `npm start`     | Start production server          |
| `npm test`      | Run tests with coverage report   |

### Frontend

| Script                  | Description                       |
| ----------------------- | --------------------------------- |
| `npm run dev`           | Start Vite dev server             |
| `npm run build`         | Type-check + build for production |
| `npm test`              | Run tests once                    |
| `npm run test:coverage` | Run tests with coverage report    |
| `npm run lint`          | Lint all files                    |

---

## CI/CD Pipeline

GitHub Actions runs on every push/PR to `main`. Both jobs enforce **70% coverage thresholds** for lines and functions.

```
backend job:
  1. Checkout → Setup Node 20 → npm ci (cached)
  2. npx prisma generate
  3. npm test -- --coverage --ci
  4. npm run build

frontend job (runs after backend passes):
  1. Checkout → Setup Node 20 → npm ci (cached)
  2. npm run test:coverage
  3. npm run build
```

---

## Future Roadmap

| Feature                     | Priority      | Notes                                                                        |
| --------------------------- | ------------- | ---------------------------------------------------------------------------- |
| **Yjs / CRDT Integration**  | 🔵 Next Major | Replace keystroke broadcasting with binary delta sync for better concurrency |
| **Docker Compose**          | 🟡 Medium     | Redis + PostgreSQL + App in one-command setup                                |
| **More Languages**          | 🟡 Medium     | Java, Go, Rust, etc.                                                         |
| **Room Sharing Link**       | 🟢 Easy       | Copy-to-clipboard shareable URL                                              |
| **AI Context Awareness**    | 🔵 Future     | Pass execution output to Gemini for smarter debugging                        |
| **JWT Blacklist on Logout** | 🟢 Easy       | `redis.set(blacklist:${token})` with TTL                                     |

---

## Author

**Rahul** — [github.com/rah7202](https://github.com/rah7202)

**Repository** — [github.com/rah7202/smart-code-lab](https://github.com/rah7202/smart-code-lab)
