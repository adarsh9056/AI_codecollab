import mongoose from 'mongoose';

const hintSchema = new mongoose.Schema({
  problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem', required: true },
  hint: { type: String, required: true },
  sentAt: { type: Date, default: Date.now },
}, { _id: false });

const evaluationSchema = new mongoose.Schema({
  problemSolving: { type: Number, min: 1, max: 5 },
  communication: { type: Number, min: 1, max: 5 },
  codeQuality: { type: Number, min: 1, max: 5 },
  overall: { type: Number, min: 1, max: 5 },
  comment: { type: String, default: '' },
}, { _id: false });

const roundSchema = new mongoose.Schema({
  roundNo: { type: Number, required: true },
  interviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem' },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date },
}, { _id: false });

const participantFeedbackSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  feedback: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const interviewSchema = new mongoose.Schema(
  {
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    interviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    mode: { type: String, enum: ['peer', 'friend'], default: 'friend' },
    level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
    scheduledFor: { type: Date },
    timeSlot: { type: String, default: '' },
    meetingDurationMin: { type: Number, default: 45 },
    status: { type: String, enum: ['scheduled', 'matched', 'active', 'completed', 'cancelled'], default: 'scheduled' },
    currentRound: { type: Number, default: 1 },
    problemIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Problem' }],
    rounds: [roundSchema],
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    notes: { type: String, default: '' },
    hintsSent: [hintSchema],
    evaluation: evaluationSchema,
    participantFeedback: [participantFeedbackSchema],
    report: { type: String, default: '' },
  },
  { timestamps: true }
);

interviewSchema.index({ roomId: 1 });
interviewSchema.index({ interviewerId: 1 });
interviewSchema.index({ candidateId: 1 });
interviewSchema.index({ status: 1, scheduledFor: 1 });
interviewSchema.index({ mode: 1, level: 1, timeSlot: 1, status: 1 });

export const Interview = mongoose.model('Interview', interviewSchema);
