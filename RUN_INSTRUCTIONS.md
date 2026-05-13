# CodeCollab — Run Locally

## Prerequisites

- Node.js 18+
- **MongoDB Atlas** (or your own MongoDB). The project uses the connection string in `backend/.env` — all data (users, rooms, problems, submissions, etc.) is stored there.

## Fresh start (MongoDB only, no old session)

To use **only** MongoDB`/Atlas and avoid signing in with old cached data:

1. **Clear browser storage** for the app: open DevTools (F12) → Application → Local Storage → select your app origin → Clear All (or use an incognito window).
2. **Start backend** (see below). Wait until you see "MongoDB connected" and either "Seeded N problems" or "Problems in DB: N".
3. **Start frontend** (see below).
4. **Register** a new account: enter email → click **Send OTP** → enter the 6-digit code from your email → fill username, password → Register. Then **log in** with it. All auth is now from MongoDB. (Without SMTP configured, the OTP is printed in the backend console.)
5. Use **Collab** (create room → select a problem from dropdown; use **Reload problems** if the list is empty). Use **Contest** (create room → 3 problems from DB). Use **Interview** (create room → one random problem is assigned). **Analytics** shows your stats (zeros until you complete sessions/submit).

## Clean database (no dummy data)

- The app uses the **database name in your connection string**. In `backend/.env`, set:  
  `MONGODB_URI=mongodb+srv://USER:PASS@YOUR-CLUSTER.mongodb.net/codecollab?retryWrites=true&w=majority`  
  Use **`codecollab`** (not `sample_mflix`) so the app has its own database. In Atlas Data Explorer, look for the **`codecollab`** database to see your app’s data (users, problems, rooms, etc.).
- The **`sample_mflix`** database in Atlas (Ned Stark, movies, etc.) is MongoDB’s sample data; the app does not use it. To remove it: Atlas Data Explorer → three dots (⋯) next to **sample_mflix** → **Drop Database**.

## Backend

```bash
cd backend
cp .env.example .env
# Edit .env: set MONGODB_URI to your Atlas URI with /codecollab before ? (e.g. ...mongodb.net/codecollab?retryWrites=...)
npm install
npm run dev
```

Server runs at `http://localhost:5001` (port 5000 is often taken by macOS AirPlay; change `PORT` in `.env` as needed). On first run, the backend connects to MongoDB and seeds 27 DSA problems if the `problems` collection is empty. Check the console for "MongoDB connected" and "Seeded …" or "Problems in DB: …".

**Registration requires email OTP.** To receive OTP in your inbox, use SMTP (e.g. Gmail):

1. **In `backend/.env`** add (use your Gmail address):
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=yourname@gmail.com
   SMTP_PASS=xxxx xxxx xxxx xxxx
   EMAIL_FROM=yourname@gmail.com
   ```
2. **Gmail:** Do **not** use your normal password. Use an **App Password**: go to [Google Account → Security → App passwords](https://myaccount.google.com/apppasswords), create one for "Mail", and paste the 16-character password into `SMTP_PASS`.
3. **Restart the backend.** On startup you should see: `[Email] SMTP configured — OTP emails will be sent to users.` Then when you click **Send OTP** on the register page, the code will arrive at the recipient’s email (check spam if needed). If SMTP is not set, the OTP is printed in the server console only.

To seed problems again manually (only adds if none exist):

```bash
npm run seed
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`. Vite proxy forwards `/api` and `/socket.io` to the backend.

If you see a CodeMirror "Unrecognized extension value" / "multiple instances of @codemirror/state" error in the console, stop the frontend, delete the Vite cache (`rm -rf node_modules/.vite` or on Windows `Remove-Item -Recurse -Force node_modules\.vite`), then run `npm run dev` again.

## Data flow

- **Register** → user is stored in MongoDB Atlas (`users` collection).
- **Login** → user is loaded from MongoDB Atlas; JWT is issued.
- **Create room, contest, interview** → stored in Atlas (`rooms`, `contests`, `interviews`).
- **Run / Submit** → submissions and AI feedback stored in Atlas (`submissions`).
- **Analytics** → reads from Atlas (`analytics_events`, `submissions`).

All data is in your Atlas database; there is no local or in-memory database.

## Quick test

1. Open http://localhost:5173
2. Register a new account (saved to Atlas)
3. Log in (validated against Atlas)
4. Create a room (Collab), copy the room code; open another browser/incognito and join with that code
5. Select a problem from the dropdown and use Run/Submit
