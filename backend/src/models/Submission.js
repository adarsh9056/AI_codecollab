import mongoose from 'mongoose';

/* ── Per-test result (stored inside Submission) ── */
const testResultSchema = new mongoose.Schema({
  passed:         { type: Boolean, required: true },
  actualOutput:   { type: String, default: '' },
  expectedOutput: { type: String, default: '' },
  executionTime:  { type: Number, default: 0 },       // ms
  isHidden:       { type: Boolean, default: false },
}, { _id: false });

/* ── Aggregate result ── */
const resultSchema = new mongoose.Schema({
  status: { type: String, enum: ['ac', 'wa', 'tle', 're', 'ce'], required: true },
  passed: { type: Number, default: 0 },
  total:  { type: Number, default: 0 },
  output: { type: String, default: '' },
  error:  { type: String, default: '' },
  tests:  [testResultSchema],
}, { _id: false });

/* ── AI feedback (optional) ── */
const aiFeedbackSchema = new mongoose.Schema({
  timeComplexity:  { type: String, default: '' },
  spaceComplexity: { type: String, default: '' },
  patterns:        [{ type: String }],
  qualityScore:    { type: Number, default: 0 },
  feedbackText:    { type: String, default: '' },
}, { _id: false });

/* ── Submission ── */
const submissionSchema = new mongoose.Schema(
  {
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem', required: true },
    roomId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
    contestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contest' },
    interviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview' },
    code:      { type: String, required: true },
    language:  { type: String, enum: ['javascript', 'python', 'cpp', 'java'], required: true },
    type:      { type: String, enum: ['run', 'submit'], required: true },
    result:    resultSchema,
    aiFeedback: aiFeedbackSchema,
  },
  { timestamps: true }
);

submissionSchema.index({ userId: 1, createdAt: -1 });
submissionSchema.index({ problemId: 1 });
submissionSchema.index({ contestId: 1 });
submissionSchema.index({ interviewId: 1 });

export const Submission = mongoose.model('Submission', submissionSchema);
