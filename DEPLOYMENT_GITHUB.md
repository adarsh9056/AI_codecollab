# Deploy CodeCollab (GitHub → Live Link)

Follow these steps so that when you **push to GitHub**, you get a **deployable link** for both frontend and backend.

---

## 1. Push your project to GitHub

```bash
cd c:\Users\rydha\OneDrive\Desktop\major
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

---

## 2. Deploy the backend (Railway or Render)

### Option A: Railway

1. Go to [railway.app](https://railway.app) and sign in with GitHub.
2. **New Project** → **Deploy from GitHub repo** → select your repo.
3. Set **Root Directory** to `backend`.
4. Add **Variables**:
   - `NODE_ENV` = `production`
   - `MONGODB_URI` = your MongoDB Atlas connection string (see below)
   - `JWT_SECRET` = a long random string (e.g. from [randomkeygen.com](https://randomkeygen.com))
   - `CLIENT_URL` = leave empty for now; set after frontend is deployed (e.g. `https://your-app.vercel.app`)
5. Railway will auto-detect Node and run `npm start` (or set **Start Command** to `node src/server.js`).
6. Under **Settings** → **Generate Domain** to get a URL like `https://your-app.up.railway.app`. Copy this URL.

### Option B: Render

1. Go to [render.com](https://render.com) and sign in with GitHub.
2. **New** → **Web Service** → connect your repo.
3. Set **Root Directory** to `backend`.
4. **Build Command:** `npm install`
5. **Start Command:** `npm start` or `node src/server.js`
6. Add **Environment Variables** (same as above: `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`).
7. Deploy and copy the service URL (e.g. `https://your-app.onrender.com`).

### MongoDB Atlas (required for production)

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and create a free cluster.
2. **Database Access** → Add user (username + password).
3. **Network Access** → Add IP `0.0.0.0/0` (allow from anywhere).
4. **Connect** → **Drivers** → copy the connection string. It looks like:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/codecollab?retryWrites=true&w=majority`
5. Put this in your backend env as `MONGODB_URI`.

---

## 3. Deploy the frontend (Vercel)

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. **Add New** → **Project** → import your repo.
3. Set **Root Directory** to `frontend` (click **Edit** next to the repo name).
4. **Build Command:** leave default (`npm run build`).
5. **Output Directory:** `dist`.
6. Add **Environment Variable**:
   - **Name:** `VITE_API_URL`
   - **Value:** your backend URL from step 2 (e.g. `https://your-app.up.railway.app`) — **no trailing slash**.
7. Deploy. You’ll get a link like `https://your-project.vercel.app`.

---

## 4. Point backend to frontend (CORS)

In Railway/Render, set:

- `CLIENT_URL` = your Vercel URL (e.g. `https://your-project.vercel.app`).

Redeploy the backend so CORS allows your frontend.

---

## 5. Current Live Deployment

| Service | Platform | URL |
|---------|----------|-----|
| **Frontend** | Vercel | [https://frontend-ten-lyart-60.vercel.app](https://frontend-ten-lyart-60.vercel.app) |
| **Backend** | Render | [https://codecollab-backend-faxf.onrender.com](https://codecollab-backend-faxf.onrender.com) |
| **GitHub** | GitHub | [https://github.com/adarsh9056/Codecollab_AI](https://github.com/adarsh9056/Codecollab_AI) |

## 6. Summary

| What        | Where to deploy | Root directory | Env vars |
|------------|------------------|----------------|----------|
| **Backend** | Railway or Render | `backend`      | `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, `TAVILY_API_KEY` |
| **Frontend** | Vercel           | `frontend`     | `VITE_API_URL` = backend URL |

After this, every **push to `main`** will redeploy:

- **Frontend** on Vercel (new link = your deployable frontend).
- **Backend** on Railway/Render (same backend URL; set that as `VITE_API_URL` in Vercel).

---

## Images

Images are loaded from **Unsplash** (see [docs/IMAGES.md](docs/IMAGES.md)). They work in production. To use your own images, add them under `frontend/public/images/` and change the `src` in the code to `/images/...`.

---

## Mic / voice (WebRTC)

The app uses **audio only** (no camera). Mic works in production if:

- The site is served over **HTTPS** (Vercel does this).
- Users allow the browser **microphone** permission when they click “Join audio”.

No extra config is needed for mic; ensure `CLIENT_URL` and `VITE_API_URL` are set correctly so Socket.IO and the API point to your deployed backend.
