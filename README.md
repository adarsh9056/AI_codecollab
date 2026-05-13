# CodeCollab AI — Real-Time Collaborative Coding Platform

An AI-assisted real-time collaborative coding platform for DSA practice, competitive programming, and mock interviews.

## Live Links

| Service | URL |
|---------|-----|
| **Live App (Frontend)** | [https://frontend-ten-lyart-60.vercel.app](https://frontend-ten-lyart-60.vercel.app) |
| **Backend API** | [https://codecollab-backend-faxf.onrender.com](https://codecollab-backend-faxf.onrender.com) |
| **API Health Check** | [https://codecollab-backend-faxf.onrender.com/health](https://codecollab-backend-faxf.onrender.com/health) |
| **GitHub Repository** | [https://github.com/adarsh9056/Codecollab_AI](https://github.com/adarsh9056/Codecollab_AI) |

> **Note:** Render free tier spins down after 15 minutes of inactivity. The first request after idle may take 30–60 seconds to cold-start.

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18 (Vite), CodeMirror 6, Socket.IO Client, WebRTC (audio), Tailwind CSS, Framer Motion, Recharts |
| **Backend** | Node.js, Express.js, Socket.IO, JWT Authentication, MongoDB (Mongoose), bcryptjs |
| **Code Execution** | Judge0 CE (JavaScript, Python, C++, Java) |
| **AI Features** | Rule-based code analysis (complexity, patterns, quality score), Tavily AI Search chatbot |
| **Real-time** | Socket.IO (code sync, chat, presence), WebRTC (audio with STUN/TURN) |
| **Database** | MongoDB Atlas |
| **Deployment** | Vercel (frontend), Render (backend) |

## Features

### Collab Mode
- Real-time code sync between users via Socket.IO
- Multi-language support (JavaScript, Python, C++, Java)
- Problem selection from 27+ DSA problems
- Code execution with test case validation
- WebRTC audio chat with STUN/TURN servers
- In-room text chat
- AI Chatbot powered by Tavily Search
- AI Feedback on submissions (time/space complexity, patterns, quality score)

### Contest Mode
- 3 random problems (Easy, Medium, Hard)
- 60-minute timed contests
- ICPC-style penalty scoring (deductions for wrong attempts)
- Real-time leaderboard via Socket.IO
- Post-contest AI analysis

### Interview Mode
- Interviewer/Candidate role-based system
- Read-only view for interviewer with evaluation form
- Hints system and role switching
- Peer matching by level and time slot
- Post-interview report generation
- AI-powered interview feedback

### Analytics Dashboard
- Sessions completed, problems solved, success rate
- 7-day activity trend chart
- Difficulty-wise breakdown
- AI-generated improvement suggestions

### Authentication & Security
- JWT authentication with HTTP-only cookies
- bcrypt password hashing (cost factor 12)
- OTP-based password reset (email or console)
- CSRF protection in production
- Rate limiting on auth and execution endpoints

## Project Structure

```
Codecollab_AI/
├── backend/                    # Express + Socket.IO + MongoDB
│   ├── src/
│   │   ├── config/             # Environment config, Judge0, limits
│   │   ├── controllers/        # Contest, Interview, Execution logic
│   │   ├── middleware/          # JWT auth middleware
│   │   ├── models/             # 9 Mongoose models
│   │   ├── routes/             # 12 route files (40+ endpoints)
│   │   ├── services/           # Judge0, AI feedback, Tavily, Email
│   │   ├── socket/             # Socket.IO event handlers
│   │   ├── scripts/            # Problem seeder (27 DSA problems)
│   │   ├── app.js              # Express app setup
│   │   └── server.js           # HTTP + Socket.IO server entry
│   └── package.json
├── frontend/                   # React + Vite
│   ├── src/
│   │   ├── components/         # 8 shared components
│   │   ├── context/            # Auth + Toast providers
│   │   ├── hooks/              # useSocket, useWebRTC
│   │   ├── pages/              # 14 page components
│   │   ├── services/           # API client
│   │   ├── utils/              # Analytics, boilerplate code
│   │   ├── App.jsx             # Router with 15 routes
│   │   └── main.jsx            # Entry point
│   ├── vercel.json             # Vercel deployment config
│   └── package.json
├── docs/                       # API, DB schemas, Socket events docs
├── render.yaml                 # Render Blueprint for backend
├── DEPLOYMENT.md               # Production deployment guide
├── DEPLOYMENT_GITHUB.md        # Step-by-step GitHub deploy guide
├── RUN_INSTRUCTIONS.md         # Local development guide
└── ARCHITECTURE.md             # High-level architecture
```

## Run Locally

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)

### Backend

```bash
cd backend
cp .env.example .env   # then fill in your own values
npm install
npm run dev
```

Backend runs at `http://localhost:5001`. On first run, it seeds 27 DSA problems.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`. Vite proxy forwards `/api` and `/socket.io` to the backend.

### Quick Test

1. Open http://localhost:5173
2. Register a new account
3. Log in
4. Create a Collab room, copy the room code
5. Open another browser/incognito and join with that code
6. Select a problem and use Run/Submit

## Deployment

### Frontend → Vercel
- Framework: Vite
- Root Directory: `frontend`
- Environment Variable: `VITE_API_URL` = your Render backend URL

### Backend → Render
- Root Directory: `backend`
- Build Command: `npm ci`
- Start Command: `npm start`
- Environment Variables: `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, `TAVILY_API_KEY`

See [DEPLOYMENT_GITHUB.md](DEPLOYMENT_GITHUB.md) for detailed step-by-step instructions.

## API Endpoints (40+)

| Route | Endpoints | Description |
|-------|-----------|-------------|
| `/api/auth` | 6 | Register, Login, Logout, Me, Forgot/Reset Password |
| `/api/users` | 4 | Profile, Update, Avatar Upload, Global Stats |
| `/api/rooms` | 5 | Create, Join, Get, Update, Leave |
| `/api/problems` | 3 | List, Random, Get by Slug/ID |
| `/api/run` | 1 | Run code against visible test cases |
| `/api/submit` | 1 | Submit code against all test cases |
| `/api/contests` | 8 | Create, Join, Submit, Leaderboard, History, AI Analysis |
| `/api/interviews` | 14 | Create, Schedule, Match, Feedback, Complete, History |
| `/api/analytics` | 2 | Record Event, Get My Analytics |
| `/api/stats` | 1 | Global Platform Stats |
| `/api/ai-chat` | 1 | AI-powered search with code context |

## Database Models (9)

`User`, `Problem`, `Room`, `Submission`, `Contest`, `Interview`, `LeaderboardEntry`, `AnalyticsEvent`, `Otp`

## Socket.IO Events (14)

`join_room`, `leave_room`, `codeChange`, `language_change`, `problem_change`, `execution_result`, `sendMessage`, `webrtc_offer`, `webrtc_answer`, `webrtc_ice`, `webrtc_leave`, `leaderboardUpdate`, `problemSolved`, `interview_completed`

## Documentation

- [API Endpoints](docs/API_ENDPOINTS.md)
- [Database Schemas](docs/DATABASE_SCHEMAS.md)
- [Socket Events](docs/SOCKET_EVENTS.md)
- [Architecture](ARCHITECTURE.md)
- [Deployment Guide](DEPLOYMENT_GITHUB.md)
- [Run Instructions](RUN_INSTRUCTIONS.md)

## Authors

Built by [adarsh9056](https://github.com/adarsh9056)
