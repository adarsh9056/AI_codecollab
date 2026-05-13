# CodeCollab — Full Folder Structure

```
major/
├── ARCHITECTURE.md
├── README.md
├── RUN_INSTRUCTIONS.md
├── DEPLOYMENT.md
├── docs/
│   ├── API_ENDPOINTS.md
│   ├── DATABASE_SCHEMAS.md
│   ├── FOLDER_STRUCTURE.md
│   └── SOCKET_EVENTS.md
├── backend/
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── config/
│       │   └── index.js
│       ├── middleware/
│       │   └── auth.js
│       ├── models/
│       │   ├── index.js
│       │   ├── User.js
│       │   ├── Room.js
│       │   ├── Problem.js
│       │   ├── Submission.js
│       │   ├── Contest.js
│       │   ├── Interview.js
│       │   └── AnalyticsEvent.js
│       ├── routes/
│       │   ├── auth.js
│       │   ├── rooms.js
│       │   ├── problems.js
│       │   ├── run.js
│       │   ├── submit.js
│       │   ├── contests.js
│       │   ├── interviews.js
│       │   └── analytics.js
│       ├── services/
│       │   ├── codeRunner.js
│       │   └── aiFeedback.js
│       ├── socket/
│       │   └── index.js
│       ├── scripts/
│       │   └── seedProblems.js
│       ├── app.js
│       └── server.js
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── context/
        │   └── AuthContext.jsx
        ├── components/
        │   ├── Layout.jsx
        │   └── CodeEditor.jsx
        ├── hooks/
        │   ├── useSocket.js
        │   └── useWebRTC.js
        ├── pages/
        │   ├── Login.jsx
        │   ├── Register.jsx
        │   ├── Dashboard.jsx
        │   ├── CollabRoom.jsx
        │   ├── ContestRoom.jsx
        │   ├── InterviewRoom.jsx
        │   └── Analytics.jsx
        └── services/
            └── api.js
```
