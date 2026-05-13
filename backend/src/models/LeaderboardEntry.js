import mongoose from 'mongoose';

const leaderboardEntrySchema = new mongoose.Schema(
  {
    contestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contest', required: true },
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rank:      { type: Number, default: 0 },
    solvedCount: { type: Number, default: 0 },
    totalTime:   { type: Number, default: 0 },        // total seconds to solve all
    penalties:   { type: Number, default: 0 },         // wrong-answer penalties
    scores: [{
      problemId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Problem' },
      problemIndex: { type: Number, required: true },
      score:        { type: Number, default: 0 },
      attempts:     { type: Number, default: 0 },
      solvedAt:     { type: Date },
    }],
  },
  { timestamps: true }
);

leaderboardEntrySchema.index({ contestId: 1, userId: 1 }, { unique: true });
leaderboardEntrySchema.index({ contestId: 1, solvedCount: -1, totalTime: 1 });

export const LeaderboardEntry = mongoose.model('LeaderboardEntry', leaderboardEntrySchema);
