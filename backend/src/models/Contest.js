import mongoose from 'mongoose';

const participantScoreSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  socketId: { type: String, default: '' },
  scores: [{
    problemIndex: { type: Number, required: true },
    score: { type: Number, default: 0 },
    solvedAt: { type: Date },
    attempts: { type: Number, default: 0 },
  }],
  totalScore: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
}, { _id: false });

const contestSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    isPublic: { type: Boolean, default: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    problemIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Problem', required: true }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    participants: [participantScoreSchema],
    status: { type: String, enum: ['pending', 'active', 'ended'], default: 'active' },
  },
  { timestamps: true }
);

contestSchema.index({ roomId: 1 });
contestSchema.index({ status: 1 });
contestSchema.index({ endTime: 1 });

export const Contest = mongoose.model('Contest', contestSchema);
