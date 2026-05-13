import mongoose from 'mongoose';

const testCaseSchema = new mongoose.Schema({
  input:          { type: String, required: true },
  expectedOutput: { type: String, default: '' },
  hidden:         { type: Boolean, default: false },
}, { _id: false });

const exampleSchema = new mongoose.Schema({
  input:       { type: String, required: true },
  output:      { type: String, required: true },
  explanation: { type: String, default: '' },
}, { _id: false });

const starterCodeSchema = new mongoose.Schema({
  javascript: { type: String, default: '' },
  python:     { type: String, default: '' },
  cpp:        { type: String, default: '' },
  java:       { type: String, default: '' },
}, { _id: false });

const problemSchema = new mongoose.Schema(
  {
    title:        { type: String, required: true },
    slug:         { type: String, required: true, unique: true, lowercase: true, trim: true },
    category:     { type: String, required: true, lowercase: true, trim: true },
    difficulty:   { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    description:  { type: String, required: true },
    inputFormat:  { type: String, default: '' },
    outputFormat: { type: String, default: '' },
    constraints:  { type: String, default: '' },
    tags:         [{ type: String }],
    functionName: { type: String, default: '' },
    starterCode:  { type: starterCodeSchema, default: () => ({}) },
    driverCode:   { type: starterCodeSchema, default: () => ({}) },
    examples:     [exampleSchema],
    testCases:    [testCaseSchema],
    timeLimit:    { type: Number, default: 5000 },
  },
  { timestamps: true }
);

problemSchema.index({ difficulty: 1 });
problemSchema.index({ category: 1 });
problemSchema.index({ tags: 1 });

export const Problem = mongoose.model('Problem', problemSchema);
