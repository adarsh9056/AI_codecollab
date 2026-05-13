/**
 * socket/index.js — Complete socket handler for:
 *   1. CollabRoom (existing)
 *   2. Connect With Friends (interview friend mode) 
 *   3. Peer Mode (anonymous random matching)
 *
 * ROOT CAUSE FIXES:
 *   - InterviewRoom was requiring JWT auth but peer rooms shouldn't need DB interview records
 *   - No peer matchmaking queue existed at all
 *   - Friend mode had no instant room creation / join flow
 *   - Role switching was only via REST API with no socket sync
 *   - question-change events were missing entirely
 *   - testcase-change events were missing
 */

import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { Room } from '../models/Room.js';
import { User } from '../models/User.js';
import { generateInterviewHint } from '../services/aiFeedback.js';

// ─── In-memory state ────────────────────────────────────────────────────────
const roomStates = new Map();   // roomCode -> state object
const roomUsers  = new Map();   // roomCode -> [{ socketId, user, role }]
const saveTimers = new Map();   // "roomCode:userId" -> timer
const peerQueue  = [];          // [{ socket, user }]  matchmaking queue

// Ephemeral interview rooms (not in DB) — friend + peer rooms
const ephemeralRooms = new Set();

const SAVE_DEBOUNCE_MS = 5000;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function createEmptyCodeState() {
  return { javascript: '', python: '', cpp: '', java: '' };
}

function ensureRoomState(roomCode, defaults = {}) {
  if (!roomStates.has(roomCode)) {
    roomStates.set(roomCode, {
      language: 'javascript',
      userCodes: {},
      question: '',
      testCases: [],
      roles: {},          // userId -> 'interviewer' | 'interviewee'
      lastExecution: null,
      ...defaults,
    });
  }
  return roomStates.get(roomCode);
}

function getRoomUsers(roomCode) {
  return roomUsers.get(roomCode) || [];
}

function addUserToRoom(roomCode, entry) {
  if (!roomUsers.has(roomCode)) roomUsers.set(roomCode, []);
  const arr = roomUsers.get(roomCode).filter(u => u.socketId !== entry.socketId);
  arr.push(entry);
  roomUsers.set(roomCode, arr);
}

function removeUserFromRoom(roomCode, socketId) {
  if (!roomUsers.has(roomCode)) return;
  const arr = roomUsers.get(roomCode).filter(u => u.socketId !== socketId);
  roomUsers.set(roomCode, arr);
  if (arr.length === 0) {
    roomUsers.delete(roomCode);
    roomStates.delete(roomCode);
    ephemeralRooms.delete(roomCode);
  }
}

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ─── Auth middleware ──────────────────────────────────────────────────────────
async function authenticateSocket(socket) {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(decoded.userId)
      .select('username displayName avatar')
      .lean();
    return user || null;
  } catch {
    return null;
  }
}

// ─── Main export ─────────────────────────────────────────────────────────────
export function attachSocketHandlers(io) {
  // Cleanup stale rooms every 5 minutes
  setInterval(() => {
    for (const [code, users] of roomUsers.entries()) {
      if (!users || users.length === 0) {
        roomUsers.delete(code);
        roomStates.delete(code);
        ephemeralRooms.delete(code);
      }
    }
  }, 5 * 60 * 1000);

  // Auth middleware — soft auth (peer rooms don't need DB user)
  io.use(async (socket, next) => {
    const user = await authenticateSocket(socket);
    if (user) {
      socket.userId = user._id.toString();
      socket.user = user;
    } else {
      // Allow unauthenticated connections for peer mode
      socket.userId = `anon_${socket.id}`;
      socket.user = { _id: socket.userId, username: 'Anonymous', displayName: 'Anonymous' };
    }
    next();
  });

  io.on('connection', (socket) => {
    socket.emit('auth_ok', { user: socket.user });

    // ══════════════════════════════════════════════════════════════════════
    // COLLAB ROOM — existing join_room flow (DB backed)
    // ══════════════════════════════════════════════════════════════════════
    socket.on('join_room', async (payload, callback) => {
      const { roomCode } = payload || {};
      if (!roomCode) return callback?.({ error: 'roomCode required' });

      try {
        const room = await Room.findOne({ roomCode });
        if (!room) return callback?.({ error: 'Room not found' });

        const roomName = `room:${roomCode}`;
        await socket.join(roomName);
        socket.roomCode = roomCode;

        const state = ensureRoomState(roomCode);
        const entry = { socketId: socket.id, user: socket.user, role: payload?.role || 'participant' };
        addUserToRoom(roomCode, entry);

        if (!state.userCodes[socket.userId]) {
          const saved = room.codeSnapshots?.get?.(socket.userId);
          state.userCodes[socket.userId] = saved && typeof saved === 'object'
            ? { ...saved }
            : createEmptyCodeState();
        }
        if (room.problemId) state.selectedProblemId = room.problemId.toString();

        const users = getRoomUsers(roomCode);
        const responseData = {
          room: room.toObject(),
          participants: users,
          codeState: state.userCodes[socket.userId],
          userCodes: state.userCodes,
          language: state.language,
          selectedProblemId: state.selectedProblemId,
          lastExecution: state.lastExecution,
        };

        socket.emit('room_joined', responseData);
        callback?.({ success: true, ...responseData });
        io.to(roomName).emit('roomUsers', users);
        socket.to(roomName).emit('user_joined', { user: socket.user });
      } catch (err) {
        callback?.({ error: err.message || 'Join failed' });
      }
    });

    socket.on('leave_room', (payload) => {
      const roomCode = payload?.roomCode || socket.roomCode;
      if (!roomCode) return;
      _leaveRoom(socket, roomCode, io);
    });

    socket.on('codeChange', (payload) => {
      const { roomCode, language, code } = payload || {};
      if (!roomCode || roomCode !== socket.roomCode) return;
      const state = ensureRoomState(roomCode);
      if (!state.userCodes[socket.userId]) state.userCodes[socket.userId] = createEmptyCodeState();
      state.userCodes[socket.userId][language] = code;
      socket.to(`room:${roomCode}`).emit('codeUpdate', { language, code, senderSocketId: socket.id, senderUserId: socket.userId });
      _debouncedSave(roomCode, socket.userId, state);
    });

    socket.on('language_change', (payload) => {
      const { roomCode, language } = payload || {};
      if (!roomCode || roomCode !== socket.roomCode) return;
      const state = roomStates.get(roomCode);
      if (state) state.language = language;
      socket.to(`room:${roomCode}`).emit('language_change', { language });
    });

    socket.on('problem_change', (payload) => {
      const { roomCode, problemId, language, codeState } = payload || {};
      if (!roomCode || roomCode !== socket.roomCode) return;
      const state = ensureRoomState(roomCode);
      if (language) state.language = language;
      if (problemId) state.selectedProblemId = problemId;
      if (codeState && typeof codeState === 'object') {
        for (const { user } of getRoomUsers(roomCode)) {
          const uid = user?._id?.toString?.();
          if (uid) state.userCodes[uid] = { ...codeState };
        }
      }
      io.to(`room:${roomCode}`).emit('problem_change', {
        problemId: state.selectedProblemId,
        language: state.language,
        codeState,
        changedBy: socket.userId,
      });
    });

    socket.on('execution_result', (payload) => {
      const { roomCode, result } = payload || {};
      if (!roomCode || roomCode !== socket.roomCode || !result) return;
      const state = ensureRoomState(roomCode);
      state.lastExecution = { result, by: socket.userId, at: Date.now() };
      io.to(`room:${roomCode}`).emit('execution_result', state.lastExecution);
    });

    socket.on('sendMessage', (payload) => {
      const { roomCode, message } = payload || {};
      if (!roomCode || roomCode !== socket.roomCode || !message) return;
      io.to(`room:${roomCode}`).emit('newMessage', {
        user: socket.user,
        message,
        timestamp: Date.now(),
      });
    });

    // WebRTC signaling
    const emitToTarget = (event, roomCode, targetUserId, data) => {
      const users = getRoomUsers(roomCode);
      const target = users.find(u => (u.user?._id?.toString?.()) === targetUserId);
      if (target) io.to(target.socketId).emit(event, { fromUserId: socket.userId, ...data });
      else socket.to(`room:${roomCode}`).emit(event, { fromUserId: socket.userId, ...data });
    };

    socket.on('webrtc_offer',  ({ roomCode, targetUserId, offer })    => emitToTarget('webrtc_offer',  roomCode, targetUserId, { offer }));
    socket.on('webrtc_answer', ({ roomCode, targetUserId, answer })   => emitToTarget('webrtc_answer', roomCode, targetUserId, { answer }));
    socket.on('webrtc_ice',    ({ roomCode, targetUserId, candidate }) => emitToTarget('webrtc_ice',   roomCode, targetUserId, { candidate }));

    // ══════════════════════════════════════════════════════════════════════
    // CONNECT WITH FRIENDS MODE — ephemeral rooms, no DB interview record
    // ══════════════════════════════════════════════════════════════════════

    /**
     * create-friend-room: Host creates a room, gets back roomCode to share
     */
    socket.on('create-friend-room', (payload, callback) => {
      const roomCode = generateRoomCode();
      ephemeralRooms.add(roomCode);

      const state = ensureRoomState(roomCode, {
        question: payload?.question || '',
        roles: { [socket.userId]: 'interviewer' },
      });

      const entry = { socketId: socket.id, user: socket.user, role: 'interviewer' };
      addUserToRoom(roomCode, entry);

      socket.join(`room:${roomCode}`);
      socket.roomCode = roomCode;

      const response = {
        roomCode,
        role: 'interviewer',
        state: { question: state.question, testCases: state.testCases, language: state.language },
      };
      socket.emit('friend-room-created', response);
      callback?.({ success: true, ...response });
    });

    /**
     * join-friend-room: Second user joins by roomCode
     */
    socket.on('join-friend-room', (payload, callback) => {
      const { roomCode } = payload || {};
      if (!roomCode) return callback?.({ error: 'roomCode required' });

      // Prefer any existing in-memory friend room state first.
      const hasInMemoryRoom = ephemeralRooms.has(roomCode) || roomStates.has(roomCode) || roomUsers.has(roomCode);
      if (hasInMemoryRoom) {
        _joinFriendRoom(socket, io, roomCode, callback);
        return;
      }

      // Try joining as regular DB-backed room fallback.
      Room.findOne({ roomCode }).then(room => {
        if (room) {
          _joinFriendRoom(socket, io, roomCode, callback);
          return;
        }

        // Last resort: if the code looks like a generated room code (friend or peer), treat it as joinable.
        if (!/^(?:PEER_)?[A-Z0-9]{6}$/.test(roomCode)) {
          return callback?.({ error: 'Room not found. Check the room code.' });
        }

        ephemeralRooms.add(roomCode);
        ensureRoomState(roomCode, { roles: {} });
        _joinFriendRoom(socket, io, roomCode, callback);
      }).catch(() => callback?.({ error: 'Room not found' }));
    });

    /**
     * question-change: Interviewer updates the question text
     */
    socket.on('question-change', (payload, callback) => {
      const { roomCode, question } = payload || {};
      if (!roomCode) return callback?.({ error: 'roomCode required' });
      // Allow updates even if socket.roomCode isn't set yet (client may emit early).
      const state = ensureRoomState(roomCode);
      state.question = question;
      io.to(`room:${roomCode}`).emit('question-update', { question, changedBy: socket.userId });
      callback?.({ success: true });
    });

    /**
     * testcase-change: Either user updates test cases
     */
    socket.on('testcase-change', (payload) => {
      const { roomCode, testCases } = payload || {};
      if (!roomCode) return;
      const state = ensureRoomState(roomCode);
      state.testCases = testCases;
      io.to(`room:${roomCode}`).emit('testcase-update', { testCases, changedBy: socket.userId });
    });

    /**
     * role-switch: Toggle interviewer/interviewee for a user
     */
    socket.on('role-switch', (payload) => {
      const { roomCode } = payload || {};
      if (!roomCode || roomCode !== socket.roomCode) return;
      const state = ensureRoomState(roomCode);
      const users = getRoomUsers(roomCode);

      // Flip roles for all users
      const newRoles = {};
      for (const u of users) {
        const uid = u.user?._id?.toString?.() || u.user;
        const currentRole = state.roles[uid] || 'interviewee';
        newRoles[uid] = currentRole === 'interviewer' ? 'interviewee' : 'interviewer';
        u.role = newRoles[uid];
      }
      state.roles = newRoles;

      io.to(`room:${roomCode}`).emit('roles-updated', {
        roles: newRoles,
        requestedBy: socket.userId,
      });
    });

    /**
     * run-code: Broadcast run status, result synced back via execution_result
     */
    socket.on('run-code', (payload) => {
      const { roomCode } = payload || {};
      if (!roomCode || roomCode !== socket.roomCode) return;
      socket.to(`room:${roomCode}`).emit('run-status', { running: true, by: socket.userId });
    });

    /**
     * output-update: Broadcast execution output to all room members
     */
    socket.on('output-update', (payload) => {
      const { roomCode, output } = payload || {};
      if (!roomCode || roomCode !== socket.roomCode) return;
      io.to(`room:${roomCode}`).emit('output-update', { output, by: socket.userId });
    });

    /**
     * give-hint: Interviewer requests a live hint for the current code.
     * Broadcasts the generated hint to the entire room.
     */
    socket.on('give-hint', (payload, callback) => {
      const { roomCode, code, language, question } = payload || {};
      if (!roomCode || roomCode !== socket.roomCode) return callback?.({ error: 'roomCode required' });

      const state = ensureRoomState(roomCode);
      const roomUser = getRoomUsers(roomCode).find(u => (u.user?._id?.toString?.() || u.user) === socket.userId);
      if (roomUser?.role !== 'interviewer' && state.roles[socket.userId] !== 'interviewer') {
        return callback?.({ error: 'Only the interviewer can give hints' });
      }

      const sourceCode = typeof code === 'string' && code.trim()
        ? code
        : (state.userCodes?.[socket.userId]?.[language || state.language] || '');

      const hint = generateInterviewHint(sourceCode, language || state.language, question || state.question);
      const payloadData = { hint, language: language || state.language, by: socket.userId, roomCode, at: Date.now() };

      state.lastHint = payloadData;
      io.to(`room:${roomCode}`).emit('hint-update', payloadData);
      callback?.({ success: true, ...payloadData });
    });

    // ══════════════════════════════════════════════════════════════════════
    // PEER MODE — anonymous random matchmaking
    // ══════════════════════════════════════════════════════════════════════

    /**
     * peer-join-queue: Add user to matchmaking queue
     */
    socket.on('peer-join-queue', (payload, callback) => {
      // Remove any stale entries for this socket
      const idx = peerQueue.findIndex(e => e.socket.id === socket.id);
      if (idx !== -1) peerQueue.splice(idx, 1);

      // Assign anonymous peer name
      const peerNumber = Math.floor(Math.random() * 9000) + 1000;
      socket.peerName = `Peer_${peerNumber}`;
      socket.peerUser = {
        _id: socket.userId,
        username: socket.peerName,
        displayName: socket.peerName,
      };

      callback?.({ success: true, peerName: socket.peerName, queueSize: peerQueue.length + 1 });

      // Try to match immediately
      if (peerQueue.length > 0) {
        const matched = peerQueue.shift();
        _createPeerMatch(socket, matched, io);
      } else {
        peerQueue.push({ socket, user: socket.peerUser });
        socket.emit('peer-queued', { position: peerQueue.length });
      }
    });

    /**
     * peer-leave-queue: Remove from queue without matching
     */
    socket.on('peer-leave-queue', () => {
      const idx = peerQueue.findIndex(e => e.socket.id === socket.id);
      if (idx !== -1) peerQueue.splice(idx, 1);
    });

    // ══════════════════════════════════════════════════════════════════════
    // DISCONNECT
    // ══════════════════════════════════════════════════════════════════════
    socket.on('disconnect', () => {
      // Remove from peer queue
      const idx = peerQueue.findIndex(e => e.socket.id === socket.id);
      if (idx !== -1) peerQueue.splice(idx, 1);

      const roomCode = socket.roomCode;
      if (!roomCode) return;

      const roomName = `room:${roomCode}`;
      removeUserFromRoom(roomCode, socket.id);
      const remaining = getRoomUsers(roomCode);
      io.to(roomName).emit('roomUsers', remaining);
      socket.to(roomName).emit('user_left', { userId: socket.userId, user: socket.user });
      socket.to(roomName).emit('webrtc_leave', { userId: socket.userId });

      // Notify peer disconnect in peer/friend rooms
      if (ephemeralRooms.has(roomCode)) {
        socket.to(roomName).emit('peer-disconnected', { user: socket.peerUser || socket.user });
      }
    });
  });
}

// ─── Private helpers ─────────────────────────────────────────────────────────

function _joinFriendRoom(socket, io, roomCode, callback) {
  const users = getRoomUsers(roomCode);
  if (users.length >= 2) {
    return callback?.({ error: 'Room is full (max 2 users)' });
  }

  const state = ensureRoomState(roomCode);

  // Preserve an existing role for sockets that created the room and re-enter it.
  const existingRole = state.roles[socket.userId];

  // Assign interviewee role if interviewer already there
  const existingRoles = Object.values(state.roles);
  const myRole = existingRole || (existingRoles.includes('interviewer') ? 'interviewee' : 'interviewer');
  state.roles[socket.userId] = myRole;

  const entry = { socketId: socket.id, user: socket.user, role: myRole };
  addUserToRoom(roomCode, entry);
  socket.join(`room:${roomCode}`);
  socket.roomCode = roomCode;

  if (!state.userCodes[socket.userId]) {
    state.userCodes[socket.userId] = createEmptyCodeState();
  }

  const allUsers = getRoomUsers(roomCode);
  const responseData = {
    roomCode,
    role: myRole,
    roles: state.roles,
    participants: allUsers,
    state: {
      question: state.question,
      testCases: state.testCases,
      language: state.language,
      codeState: state.userCodes[socket.userId],
    },
  };

  socket.emit('friend-room-joined', responseData);
  callback?.({ success: true, ...responseData });

  // Notify host that someone joined
  io.to(`room:${roomCode}`).emit('roomUsers', allUsers);
  socket.to(`room:${roomCode}`).emit('user_joined', { user: socket.user, role: myRole });
}

function _createPeerMatch(socketA, entryB, io) {
  const socketB = entryB.socket;

  const roomCode = `PEER_${generateRoomCode()}`;
  ephemeralRooms.add(roomCode);

  // Randomly assign roles
  const [interviewer, interviewee] = Math.random() < 0.5
    ? [socketA, socketB]
    : [socketB, socketA];

  const state = ensureRoomState(roomCode, {
    roles: {
      [interviewer.userId]: 'interviewer',
      [interviewee.userId]: 'interviewee',
    },
  });

  const entryA = { socketId: socketA.id, user: socketA.peerUser || socketA.user, role: state.roles[socketA.userId] };
  const entryB2 = { socketId: socketB.id, user: socketB.peerUser || socketB.user, role: state.roles[socketB.userId] };

  addUserToRoom(roomCode, entryA);
  addUserToRoom(roomCode, entryB2);

  socketA.join(`room:${roomCode}`);
  socketB.join(`room:${roomCode}`);
  socketA.roomCode = roomCode;
  socketB.roomCode = roomCode;

  const users = getRoomUsers(roomCode);

  const matchData = {
    roomCode,
    roles: state.roles,
    participants: users,
  };

  // Emit peer-match-found to both sockets with their respective roles
  socketA.emit('peer-match-found', { ...matchData, myRole: state.roles[socketA.userId], myName: socketA.peerName });
  socketB.emit('peer-match-found', { ...matchData, myRole: state.roles[socketB.userId], myName: socketB.peerName });

  io.to(`room:${roomCode}`).emit('roomUsers', users);
}

function _leaveRoom(socket, roomCode, io) {
  const roomName = `room:${roomCode}`;
  socket.leave(roomName);
  removeUserFromRoom(roomCode, socket.id);
  const remaining = getRoomUsers(roomCode);
  io.to(roomName).emit('roomUsers', remaining);
  socket.to(roomName).emit('user_left', { userId: socket.userId });
  socket.roomCode = null;
}

function _debouncedSave(roomCode, userId, state) {
  const key = `${roomCode}:${userId}`;
  if (saveTimers.has(key)) clearTimeout(saveTimers.get(key));
  saveTimers.set(key, setTimeout(async () => {
    try {
      await Room.updateOne(
        { roomCode },
        { $set: { [`codeSnapshots.${userId}`]: state.userCodes[userId] } }
      );
    } catch { /* ephemeral room, skip */ }
    saveTimers.delete(key);
  }, SAVE_DEBOUNCE_MS));
}
