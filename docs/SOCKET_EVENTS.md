# CodeCollab — Socket.IO Event Map

Namespace: `/` (default) or `/collab`, `/contest`, `/interview` — we use **single namespace** with room-based separation.

## Connection & Auth
- **Client → Server:** On connect, client sends `auth` with `{ token: string }`.
- **Server:** Verifies JWT, attaches `userId` to socket, then allows join room.
- **Server → Client:** `auth_ok` | `auth_error`.

---

## Room & Presence
| Direction | Event | Payload | Description |
|-----------|--------|---------|-------------|
| C→S | join_room | { roomCode, mode?, role? } | Join room; server adds socket to room |
| S→C | room_joined | { room, participants } | Confirm + current participants |
| S→C | user_joined | { user, participant } | Broadcast to room |
| S→C | user_left | { userId, participant } | Broadcast to room |
| C→S | leave_room | { roomCode } | Leave room |
| C→S | presence | { roomCode, cursor?, selection? } | Optional cursor/selection for collab |
| S→C | presence_update | { userId, cursor, selection } | Broadcast presence to room |

---

## Collab Mode — Code Sync
| Direction | Event | Payload | Description |
|-----------|--------|---------|-------------|
| C→S | code_update | { roomCode, delta, version } | Operational transform / delta |
| S→C | code_update | { userId, delta, version } | Broadcast to others in room |
| C→S | code_full | { roomCode, code, language } | Full sync (e.g. on join) |
| S→C | code_full | { code, language } | Server sends full state to joiner |
| C→S | language_change | { roomCode, language } | Language selector |
| S→C | language_change | { language } | Broadcast |

---

## Chat
| Direction | Event | Payload | Description |
|-----------|--------|---------|-------------|
| C→S | chat_message | { roomCode, text } | Send message |
| S→C | chat_message | { userId, username, text, timestamp } | Broadcast to room |

---

## Contest Mode
| Direction | Event | Payload | Description |
|-----------|--------|---------|-------------|
| S→C | contest_start | { contest, problems } | Timer started |
| S→C | contest_tick | { remainingSeconds } | Optional server-side tick |
| S→C | leaderboard_update | { participants, rankings } | After any submit |
| S→C | problem_solved | { userId, problemIndex } | Lock + green check |

---

## Mock Interview
| Direction | Event | Payload | Description |
|-----------|--------|---------|-------------|
| C→S | hint_request | { roomCode, problemId } | Candidate requests hint |
| S→C | hint_request | { candidateId } | To interviewer |
| C→S | hint_send | { roomCode, problemId, hint } | Interviewer sends hint |
| S→C | hint_receive | { hint } | To candidate |
| C→S | evaluation_draft | { roomId, evaluation } | Interviewer saves draft |

---

## WebRTC Signaling (Audio)
| Direction | Event | Payload | Description |
|-----------|--------|---------|-------------|
| C→S | webrtc_offer | { roomCode, targetUserId, offer } | SDP offer |
| S→C | webrtc_offer | { fromUserId, offer } | To target |
| C→S | webrtc_answer | { roomCode, targetUserId, answer } | SDP answer |
| S→C | webrtc_answer | { fromUserId, answer } | To initiator |
| C→S | webrtc_ice | { roomCode, targetUserId, candidate } | ICE candidate |
| S→C | webrtc_ice | { fromUserId, candidate } | To peer |
| C→S | webrtc_leave | { roomCode } | Leave audio |
| S→C | webrtc_leave | { userId } | Notify room |

---

## Generic
| Direction | Event | Description |
|-----------|--------|-------------|
| S→C | error | { message, code } |
| C→S | ping | Keepalive |
| S→C | pong | Keepalive |
