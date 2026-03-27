# Smart Code Lab 🧪

A real-time collaborative code editor with AI-powered assistance, multi-language support, and version history — built for teams who want to write, run, and review code together.

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat&logo=prisma&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=flat&logo=socket.io&logoColor=white)

---

## ✨ Features

- **Real-time collaboration** — Live cursors, user presence, and instant code sync across all users in a room
- **Multi-language support** — Python, JavaScript, C++, C with per-language syntax themes and starter templates
- **AI assistance (Gemini Flash 2.5)** — Full code analysis, freeform Q&A, and selection-aware inline toolbar
- **Code execution** — Run code via Judge0 with stdin support and live output
- **Version history** — Auto-saved snapshots on every run and Ctrl+S, with one-click restore
- **Persistent rooms** — Code is saved to the database and reloaded on re-join
- **Download code** — Auto-named file with username + timestamp
- **Rate limiting** — Client + server side (5 req/min per user)

---

## 🏗️ Architecture

```mermaid
graph TB
    subgraph Client ["Frontend (React + TypeScript + Vite)"]
        direction TB
        EP["EditorPage"]
        NB["Navbar"]
        UP["UserPresenceBar"]
        ME["Monaco Editor"]
        ST["SelectionToolbar"]

        subgraph RightSide ["Right Panel"]
            CI["CodeInputPanel"]
            AI["AIPanel"]
            VP["VersionPanel"]
        end

        subgraph Hooks ["Custom Hooks"]
            UC["useCollaboration"]
            UAI["useAI"]
            UEP["useEditorPersistence"]
        end

        EP --> NB
        EP --> UP
        EP --> ME
        EP --> ST
        EP --> RightSide
        EP --> Hooks
    end

    subgraph Server ["Backend (Node.js + Express + TypeScript)"]
        direction TB
        APP["app.ts"]

        subgraph Routes ["Routes"]
            AR["ai.route.ts"]
            CR["compile.route.ts"]
            RR["room.route.ts"]
            SR["codeSnapshot.routes.ts"]
        end

        subgraph Controllers ["Controllers"]
            AC["ai.controller.ts"]
            CC["compile.controller.ts"]
            RC["room.controller.ts"]
            SC["codeSnapshot.controller.ts"]
        end

        subgraph Services ["Services"]
            AS["ai.service.ts"]
            J0["judge0.service.ts"]
            RS["room.service.ts"]
            CSS["codeSnapshot.service.ts"]
        end

        SOC["socket.ts (Socket.IO)"]
        DB["prisma.ts (Prisma ORM)"]

        APP --> Routes
        APP --> SOC
        Routes --> Controllers
        Controllers --> Services
        Services --> DB
    end

    subgraph External ["External Services"]
        GEM["Gemini Flash 2.5 API"]
        J0EXT["Judge0 API"]
        PG[("PostgreSQL / SQLite")]
    end

    ME -- "onChange / onMount" --> UC
    UC -- "socket events" --> SOC
    SOC -- "cursor-move\ncontent-edited\nusers\ncode-sync" --> UC

    UAI -- "POST /ai/generate" --> AC
    AC --> AS
    AS --> GEM

    CI -- "POST /compile" --> CC
    CC --> J0
    J0 --> J0EXT

    UEP -- "GET /room/:id\nPOST /room/:id/save\nPOST /snapshot/:id" --> RC
    RC --> RS
    RS --> DB
    DB --> PG

    VP -- "GET /snapshots/:id" --> SC
    SC --> CSS
    CSS --> DB
```

---

## 📁 Project Structure

```
Smart Code Lab/
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   └── schema.prisma
│   └── src/
│       ├── controllers/
│       │   ├── ai.controller.ts
│       │   ├── codeSnapshot.controller.ts
│       │   ├── compile.controller.ts
│       │   └── room.controller.ts
│       ├── db/
│       │   └── prisma.ts
│       ├── routes/
│       │   ├── ai.route.ts
│       │   ├── codeSnapshot.routes.ts
│       │   ├── compile.route.ts
│       │   └── room.route.ts
│       ├── services/
│       │   ├── ai.service.ts
│       │   ├── codeSnapshot.service.ts
│       │   ├── judge0.service.ts
│       │   └── room.service.ts
│       ├── sockets/
│       │   └── socket.ts
│       ├── types/
│       │   └── index.ts
│       ├── app.ts
│       └── index.ts
│
└── frontend/
    └── src/
        ├── assets/
        ├── components/
        │   ├── AIPanel.tsx
        │   ├── CodeInputPanel.tsx
        │   ├── EditorPage.tsx
        │   ├── Footer.tsx
        │   ├── Home.tsx
        │   ├── LanguageBadge.tsx
        │   ├── Navbar.tsx
        │   ├── RightPanel.tsx
        │   ├── SelectionToolbar.tsx
        │   ├── UserPresenceBar.tsx
        │   ├── VersionHistory.tsx
        │   └── VersionPanel.tsx
        ├── hooks/
        │   ├── useAI.ts
        │   ├── useCollaboration.ts
        │   └── useEditorPersistence.ts
        ├── languageOptions.ts
        ├── socket.ts
        └── App.tsx
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- npm or pnpm
- A running PostgreSQL instance (or update `schema.prisma` for SQLite)
- Judge0 API key (self-hosted or RapidAPI)
- Google Gemini API key

### 1. Clone the repo

```bash
git clone https://github.com/rah7202/smart-code-lab.git
cd smart-code-lab
```

### 2. Backend setup

```bash
cd backend
npm install
```

Create a `.env` file:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/smartcodelab"
GEMINI_API_KEY="your_gemini_api_key"
JUDGE0_API_KEY="your_judge0_api_key"
JUDGE0_BASE_URL="https://judge0-ce.p.rapidapi.com"
PORT=8000
```

Run migrations and start:

```bash
npx prisma migrate dev
npm run dev
```

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`

---

## 🔌 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/compile` | Execute code via Judge0 |
| `POST` | `/ai/generate` | Ask Gemini about code |
| `DELETE` | `/ai/history/:roomId` | Clear AI chat history |
| `GET` | `/room/:roomId` | Load room code + language |
| `POST` | `/room/:roomId/save` | Save current code to room |
| `POST` | `/snapshot/:roomId` | Save a named snapshot |
| `GET` | `/snapshots/:roomId` | Get all snapshots for a room |

### Socket Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `join` | Client → Server | `{ RoomId, username }` | Join a room |
| `content-edited` | Client ↔ Server | `{ code, language }` | Broadcast code change |
| `cursor-move` | Client ↔ Server | `{ line, column, username, color, socketId }` | Broadcast cursor position |
| `code-sync` | Server → Client | `string` | Send existing code to new joiner |
| `users` | Server → Client | `User[]` | Updated user list with colors |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | React 18 + TypeScript + Vite |
| Editor | Monaco Editor (`@monaco-editor/react`) |
| Styling | Tailwind CSS v4 |
| Real-time | Socket.IO |
| Backend | Node.js + Express + TypeScript |
| ORM | Prisma |
| Database | PostgreSQL |
| Code execution | Judge0 API |
| AI | Google Gemini Flash 2.5 |
| State management | React hooks (no external lib) |

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + S` | Save snapshot |
| `Enter` (in AI input) | Send question to Gemini |
| `Shift + Enter` | New line in AI input |

---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first.

---

## 📄 License

MIT © [rah7202](https://github.com/rah7202)