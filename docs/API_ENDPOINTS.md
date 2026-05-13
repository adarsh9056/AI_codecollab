# CodeCollab — REST API Endpoints

Base URL: `/api`  
Auth: `Authorization: Bearer <accessToken>` or cookie `token=<accessToken>`.

---

## Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/register | No | Register (email, password, username, displayName) |
| POST | /auth/login | No | Login (email, password) → returns user + accessToken |
| POST | /auth/logout | Yes | Invalidate token / clear cookie |
| GET | /auth/me | Yes | Current user profile |
| PUT | /auth/profile | Yes | Update displayName, avatar, username (if unique) |

---

## Rooms
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /rooms | Yes | Create room (mode, role for interview) → roomCode |
| GET | /rooms/:roomCode | Yes | Get room by code (participants, problem, contestId) |
| POST | /rooms/join | Yes | Join room (roomCode) → room details |
| PATCH | /rooms/:roomId | Yes | Update room (status, problemId, settings) |
| POST | /rooms/:roomId/leave | Yes | Leave room |

---

## Problems
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /problems | Yes | List problems (optional: difficulty, tags, limit) |
| GET | /problems/random | Yes | Get N random problems (query: count=3, difficulty?) |
| GET | /problems/:id | Yes | Get single problem (no hidden test cases in response) |

---

## Code Execution
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /run | Yes | Run code (code, language, problemId) → sample tests only; output + pass/fail |
| POST | /submit | Yes | Submit (code, language, problemId, roomId?, contestId?) → hidden tests; store submission; return result + AI feedback |

---

## Contests
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /contests | Yes | Create contest (roomId, problemIds [3]) → contest with 25-min window |
| GET | /contests/:id | Yes | Get contest (problems, participants, leaderboard) |
| GET | /contests/:id/leaderboard | Yes | Live leaderboard |
| POST | /contests/:id/submit | Yes | Submit for contest (validates time, updates score, locks problem) |

---

## Interviews
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /interviews | Yes | Create interview (roomId, interviewerId, candidateId) |
| GET | /interviews/:roomId | Yes | Get interview by room |
| PATCH | /interviews/:id | Yes | Update notes, hints, evaluation |
| POST | /interviews/:id/complete | Yes | End interview, generate report, save |

---

## Analytics
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /analytics/event | Yes | Ingest event (eventType, payload, sessionId, roomId?) |
| GET | /analytics/me | Yes | User stats: sessions, problems solved, success rate, trends, suggestions |
