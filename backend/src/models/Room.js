import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  socketId: { type: String, default: '' },
  joinedAt: { type: Date, default: Date.now },
  role: { type: String, enum: ['interviewer', 'candidate', 'participant'], default: 'participant' },
}, { _id: false });

const roomSchema = new mongoose.Schema(
  {
    roomCode: { type: String, required: true, unique: true },
    mode: { type: String, enum: ['collab', 'contest', 'interview'], required: true },
    status: { type: String, enum: ['waiting', 'active', 'completed'], default: 'waiting' },
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    participants: [participantSchema],
    problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem' },
    contestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contest' },
    settings: {
      language: { type: String, default: 'javascript' },
      blurPartnerCode: { type: Boolean, default: false },
    },
    codeSnapshots: {
      type: Map,
      of: {
        javascript: { type: String, default: '' },
        python: { type: String, default: '' },
        cpp: { type: String, default: '' },
        java: { type: String, default: '' },
      },
      default: () => new Map(),
    },
  },
  { timestamps: true }
);


roomSchema.index({ status: 1 });
roomSchema.index({ contestId: 1 });

export const Room = mongoose.model('Room', roomSchema);
