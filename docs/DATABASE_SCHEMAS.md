# CodeCollab — Database Schemas (MongoDB / Mongoose)

## Collections

### users
```javascript
{
  _id: ObjectId,
  email: String,           // unique, required
  passwordHash: String,    // required for email auth
  username: String,        // unique, required
  displayName: String,
  avatar: String,          // URL
  rating: Number,          // default 0
  role: String,            // 'user' | 'admin', default 'user'
  createdAt: Date,
  updatedAt: Date
}
```
Indexes: `email` (unique), `username` (unique).

---

### profiles (embedded or 1:1 with users)
User-facing profile: we use `users` with displayName, avatar, rating. No separate profiles collection.

---

### rooms
```javascript
{
  _id: ObjectId,
  roomCode: String,        // unique, 6-char, required
  mode: String,            // 'collab' | 'contest' | 'interview'
  status: String,          // 'waiting' | 'active' | 'completed'
  hostId: ObjectId,        // ref User
  participants: [{
    userId: ObjectId,
    socketId: String,
    joinedAt: Date,
    role: String           // for interview: 'interviewer' | 'candidate'
  }],
  problemId: ObjectId,     // ref Problem (collab/interview current problem)
  contestId: ObjectId,     // ref Contest (contest mode only)
  settings: {
    language: String,
    blurPartnerCode: Boolean
  },
  createdAt: Date,
  updatedAt: Date
}
```
Indexes: `roomCode` (unique), `status`, `contestId`.

---

### problems
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  constraints: String,
  difficulty: String,      // 'easy' | 'medium' | 'hard'
  tags: [String],         // e.g. ['array', 'two-pointers']
  examples: [{
    input: String,
    output: String,
    explanation: String
  }],
  sampleTestCases: [{
    input: String,
    expectedOutput: String
  }],
  hiddenTestCases: [{
    input: String,
    expectedOutput: String
  }],
  timeLimit: Number,       // ms, default 5000
  createdAt: Date,
  updatedAt: Date
}
```
Indexes: `difficulty`, `tags`.

---

### submissions
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  problemId: ObjectId,
  roomId: ObjectId,        // optional
  contestId: ObjectId,     // optional
  code: String,
  language: String,        // 'javascript' | 'python' | 'cpp' | 'java'
  type: String,            // 'run' | 'submit'
  result: {
    status: String,       // 'ac' | 'wa' | 'tle' | 're' | 'ce'
    passed: Number,
    total: Number,
    output: String,
    error: String,
    tests: [{
      passed: Boolean,
      actualOutput: String,
      expectedOutput: String
    }]
  },
  aiFeedback: {
    timeComplexity: String,
    spaceComplexity: String,
    patterns: [String],
    qualityScore: Number,
    feedbackText: String
  },
  createdAt: Date
}
```
Indexes: `userId`, `problemId`, `contestId`, `createdAt`.

---

### contests
```javascript
{
  _id: ObjectId,
  roomId: ObjectId,
  problemIds: [ObjectId],  // 3 problems
  startTime: Date,
  endTime: Date,           // startTime + 25 min
  participants: [{
    userId: ObjectId,
    socketId: String,
    scores: [{
      problemIndex: Number,
      score: Number,
      solvedAt: Date,
      attempts: Number
    }],
    totalScore: Number,
    lastUpdated: Date
  }],
  status: String,          // 'pending' | 'active' | 'ended'
  createdAt: Date,
  updatedAt: Date
}
```
Indexes: `roomId`, `status`, `endTime`.

---

### interviews
```javascript
{
  _id: ObjectId,
  roomId: ObjectId,
  interviewerId: ObjectId,
  candidateId: ObjectId,
  problemIds: [ObjectId],
  startedAt: Date,
  endedAt: Date,
  notes: String,           // interviewer private notes
  hintsSent: [{
    problemId: ObjectId,
    hint: String,
    sentAt: Date
  }],
  evaluation: {
    problemSolving: Number,  // 1-5
    communication: Number,
    codeQuality: Number,
    overall: Number,
    comment: String
  },
  report: String,         // generated summary
  createdAt: Date,
  updatedAt: Date
}
```
Indexes: `roomId`, `interviewerId`, `candidateId`.

---

### analytics_events
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  eventType: String,       // 'session_start' | 'submission' | 'voice_duration' | 'interview_complete'
  payload: Mixed,          // event-specific data
  sessionId: String,
  roomId: ObjectId,
  contestId: ObjectId,
  createdAt: Date
}
```
Indexes: `userId`, `eventType`, `createdAt`, `sessionId`.
