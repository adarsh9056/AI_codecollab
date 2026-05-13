import mongoose from 'mongoose';

const analyticsEventSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    eventType: { type: String, required: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    sessionId: { type: String, default: '' },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
    contestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contest' },
  },
  { timestamps: true }
);

analyticsEventSchema.index({ userId: 1, createdAt: -1 });
analyticsEventSchema.index({ eventType: 1 });
analyticsEventSchema.index({ sessionId: 1 });

export const AnalyticsEvent = mongoose.model('AnalyticsEvent', analyticsEventSchema);
