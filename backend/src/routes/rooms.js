import express from 'express';
import { Room } from '../models/Room.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function ensureUniqueRoomCode() {
  let code;
  let exists = true;
  while (exists) {
    code = generateRoomCode();
    const r = await Room.findOne({ roomCode: code });
    exists = !!r;
  }
  return code;
}

// POST /api/rooms - create room
router.post('/', authenticate, async (req, res) => {
  try {
    const { mode, role } = req.body;
    if (!['collab', 'contest', 'interview'].includes(mode)) {
      return res.status(400).json({ message: 'Invalid mode' });
    }
    const roomCode = await ensureUniqueRoomCode();
    const room = await Room.create({
      roomCode,
      mode,
      hostId: req.user._id,
      participants: [{ userId: req.user._id, role: mode === 'interview' ? (role || 'interviewer') : 'participant' }],
    });
    const populated = await Room.findById(room._id).populate('participants.userId', 'username displayName avatar').populate('problemId');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Create room failed' });
  }
});

// GET /api/rooms/:roomCode
router.get('/:roomCode', authenticate, async (req, res) => {
  try {
    const room = await Room.findOne({ roomCode: req.params.roomCode })
      .populate('participants.userId', 'username displayName avatar')
      .populate('problemId')
      .populate('contestId');
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json(room);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Fetch failed' });
  }
});

// POST /api/rooms/join
router.post('/join', authenticate, async (req, res) => {
  try {
    const { roomCode } = req.body;
    if (!roomCode) return res.status(400).json({ message: 'roomCode required' });
    const room = await Room.findOne({ roomCode })
      .populate('participants.userId', 'username displayName avatar')
      .populate('problemId')
      .populate('contestId');
    if (!room) return res.status(404).json({ message: 'Room not found' });
    const already = room.participants.some(p => p.userId._id.toString() === req.user._id.toString());
    if (!already) {
      room.participants.push({ userId: req.user._id, role: room.mode === 'interview' ? 'candidate' : 'participant' });
      await room.save();
    }
    const updated = await Room.findById(room._id)
      .populate('participants.userId', 'username displayName avatar')
      .populate('problemId')
      .populate('contestId');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Join failed' });
  }
});

// PATCH /api/rooms/:roomId
router.patch('/:roomId', authenticate, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    if (room.hostId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only host can update room' });
    }
    const { status, problemId, settings } = req.body;
    if (status !== undefined) room.status = status;
    if (problemId !== undefined) room.problemId = problemId;
    if (settings !== undefined) {
      if (settings.language !== undefined) room.settings.language = settings.language;
      if (settings.blurPartnerCode !== undefined) room.settings.blurPartnerCode = settings.blurPartnerCode;
    }
    await room.save();
    const updated = await Room.findById(room._id)
      .populate('participants.userId', 'username displayName avatar')
      .populate('problemId')
      .populate('contestId');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Update failed' });
  }
});

// POST /api/rooms/:roomId/leave
router.post('/:roomId/leave', authenticate, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    room.participants = room.participants.filter(p => p.userId.toString() !== req.user._id.toString());
    await room.save();
    res.json({ message: 'Left room' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Leave failed' });
  }
});

export default router;
