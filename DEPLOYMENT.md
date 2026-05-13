# CodeCollab AI — Production Deployment

## Current Live Deployment

| Service | Platform | URL |
|---------|----------|-----|
| **Frontend** | Vercel | [https://frontend-ten-lyart-60.vercel.app](https://frontend-ten-lyart-60.vercel.app) |
| **Backend** | Render | [https://codecollab-backend-faxf.onrender.com](https://codecollab-backend-faxf.onrender.com) |
| **GitHub** | GitHub | [https://github.com/adarsh9056/Codecollab_AI](https://github.com/adarsh9056/Codecollab_AI) |

## Backend

- **Host**: Any Node.js host (Railway, Render, Fly.io, AWS, etc.).
- **Environment variables**:
  - `PORT` (default 5000)
  - `NODE_ENV=production`
  - `MONGODB_URI` (e.g. MongoDB Atlas)
  - `JWT_SECRET` (strong random string)
  - `JWT_EXPIRES_IN` (e.g. 7d)
  - `CLIENT_URL` (frontend origin, e.g. `https://frontend-ten-lyart-60.vercel.app`)
  - `TAVILY_API_KEY` (for AI chatbot in Collab mode)
- **Socket.IO**: Use the same server instance; for multi-instance, use Redis adapter (`@socket.io/redis-adapter`).
- **Code execution**: Judge0 CE for JavaScript, Python, C++, Java with sandbox, time limits, and test case evaluation.

## Frontend

- **Build**: `npm run build` in `frontend/`. Output in `frontend/dist`.
- **Env**: Set `VITE_API_URL` to the backend URL (e.g. `https://codecollab-backend-faxf.onrender.com`) when deploying to a different origin; in local dev, Vite proxy handles routing.
- **Host**: Any static host (Vercel, Netlify, S3+CloudFront, etc.). Point API and WebSocket to the backend.

## Security checklist

- Use HTTPS everywhere.
- Strong `JWT_SECRET`; rotate if compromised.
- CORS: `CLIENT_URL` must match the frontend origin.
- Code execution: Judge0 CE runs code in isolated sandboxes with time and memory limits.
