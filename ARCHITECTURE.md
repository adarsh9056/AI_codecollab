# CodeCollab — Architecture

## Overview

CodeCollab is a real-time collaborative coding platform with three modes: **Collab** (pair programming), **Contest** (timed DSA), and **Mock Interview**. The system uses a client-server architecture with WebSocket (Socket.IO) for real-time events and WebRTC for audio-only voice chat.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (React + Vite)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │ Auth Context│  │ Socket Hook │  │ WebRTC Hook │  │ CodeMirror      │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  │ Editor          │  │
│         │                │                │         └────────┬────────┘  │
│         └────────────────┼────────────────┘                  │          │
│                          │                                    │          │
│  ┌───────────────────────┴───────────────────────────────────┴────────┐  │
│  │  Collab Mode  │  Contest Mode  │  Mock Interview Mode              │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                    HTTPS (REST) │  WSS (Socket.IO)
                                │
┌───────────────────────────────┴─────────────────────────────────────────┐
│                     BACKEND (Node.js + Express)                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │ JWT Auth    │  │ REST API    │  │ Socket.IO   │  │ VM2 Sandbox     │  │
│  │ Middleware  │  │ Routes      │  │ Namespaces  │  │ (Code Run)      │  │
│  └─────────────┘  └─────────────┘  └──────┬──────┘  └─────────────────┘  │
│                                            │  Signaling for WebRTC         │
│  ┌────────────────────────────────────────┴─────────────────────────────┐  │
│  │  MongoDB (Mongoose) — Users, Rooms, Problems, Submissions, Contests   │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘
```

## Components

### Frontend
- **React 18** with Vite for fast builds and HMR.
- **CodeMirror 6** for syntax highlighting and collaborative cursors (sync via Socket.IO).
- **Socket.IO client** for real-time: code deltas, presence, chat, contest updates, signaling.
- **WebRTC** (audio only): peer connection managed via Socket.IO signaling; mute/unmute, join/leave.
- **Tailwind CSS** for responsive, dark-theme UI.
- **React Router** for protected routes and mode-specific layouts.

### Backend
- **Express** for REST API (auth, rooms, problems, submissions, contests, interviews, analytics).
- **Socket.IO** server: room-based namespaces; events for code sync, chat, presence, signaling, contest scoreboard.
- **JWT** in HTTP-only cookies (or Authorization header) for auth; middleware on protected routes.
- **MongoDB + Mongoose** for all persistent data; indexes on roomCode, userId, contestId.
- **VM2** (or isolated-vm / vm2 alternative) for safe code execution with timeout, no fs/net.

### Security
- Code execution: timeout (e.g. 5s), no require('fs'), no require('net'), no process.exit; stdout/stderr captured.
- JWT: short-lived access token; optional refresh token; verify on every protected request and socket connection.
- Room access: socket joins only after verifying JWT and room membership.
- Contest: hidden test cases never sent to client; run uses sample tests only; submit runs on server with full tests.

## Data Flow

### Collab Mode
1. User creates/joins room → API creates/returns room → client joins Socket room.
2. Code changes → client sends delta/operations → server broadcasts to other participants.
3. Run/Submit → client sends code + language to API → server runs in VM2 → returns output and pass/fail.
4. Voice: client requests offer → server relays to peer → answer/ICE exchanged via Socket → WebRTC established.

### Contest Mode
1. User starts contest → API creates contest with 3 random problems → client gets contest ID and problems (no hidden tests).
2. Timer runs client-side; server also tracks end time for validation.
3. Submit → server runs hidden tests → updates score and locks problem; Socket broadcasts leaderboard.
4. No code sync between users; each has independent editor per problem.

### Mock Interview Mode
1. User creates room as Interviewer/Candidate → room stores role.
2. Interviewer: read-only code view (receives code sync from candidate), notes, hints, evaluation form.
3. Candidate: full editor; code sync sent to interviewer; can request hints.
4. Signaling for WebRTC same as Collab; post-interview report stored in DB.

## Scalability Notes
- Socket.IO adapter can be swapped to Redis for multi-instance.
- Code execution can be moved to a separate worker queue (Bull + worker) if load grows.
- MongoDB indexes and lean queries for leaderboards and analytics.
