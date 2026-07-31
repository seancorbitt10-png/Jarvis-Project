# Synapse · Jarvis

Synapse is a student operating system. **Jarvis** is the orchestrator agent that connects your school apps and plugins, then answers across all of them.

## v1 scope

- Web app (chat-first) with Google sign-in (+ demo login for local testing)
- Jarvis orchestrator with tool calling + long-term memory
- Read-only connections: Google Calendar, Gmail, Google Classroom
- RenWeb / FACTS connector stub (demo events when enabled)
- Plugin system + sample **Notes** plugin Jarvis can read when permitted
- Unified “What’s tomorrow?” timeline demo
- Cloud/SaaS-ready (server-stored sessions, conversations, memories)

## Quick start

```bash
cp .env.example .env
npm install
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment

| Variable | Purpose |
|---|---|
| `AUTH_SECRET` | NextAuth secret (`openssl rand -base64 32`) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth client |
| `OPENAI_API_KEY` | Live Jarvis LLM (gpt-4o-mini) |
| `DEMO_MODE` | `true` uses seeded/demo school data + offline Jarvis replies |
| `DATABASE_URL` | SQLite by default (`file:./dev.db`); swap to Postgres for production |

### Google Cloud setup

1. Create an OAuth client (Web) with redirect URI: `http://localhost:3000/api/auth/callback/google`
2. Enable **Google Calendar API**, **Gmail API**, and **Google Classroom API**
3. Put the client ID/secret in `.env`
4. Set `DEMO_MODE=false` when you want live Google + OpenAI

### Demo path (no keys yet)

1. Sign in as **Demo student**
2. In Chat, click **Seed demo data**
3. Ask: “What’s tomorrow look like?”

## Architecture

- **Next.js App Router** + Auth.js (NextAuth v5)
- **Prisma** + SQLite (Postgres-ready schema)
- **Jarvis** via Vercel AI SDK tools (`get_tomorrow_timeline`, Classroom, Gmail, RenWeb, Notes, memory)
- **Plugins**: install → grant Jarvis read → agent can pull data without opening the app

## Product notes

- Platform name: **Synapse**
- Agent name: **Jarvis**
- v1 external actions are **read-only** (no sending mail / submitting work)
- Blackboard intentionally omitted for now
