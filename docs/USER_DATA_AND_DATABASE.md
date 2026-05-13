# Where Login/Register Data Is Stored & How to See It

## Where it is stored

When you **register** or **login**, your data is stored in **MongoDB**:

- **Database name:** Same as in your backend env (e.g. `codecollab` if you use `MONGODB_URI=mongodb://.../codecollab`).
- **Collection:** `users`

Each user document looks like:

```javascript
{
  _id: ObjectId("..."),
  email: "you@example.com",
  passwordHash: "...",        // hashed, never stored in plain text
  username: "yourname",
  displayName: "Your Name",
  avatar: "",
  rating: 0,
  role: "user",
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

Other collections used by the app:

- **rooms** – Created/joined rooms (roomCode, mode, participants, etc.)
- **problems** – DSA problems (from seed or admin)
- **submissions** – Run/Submit results (code, language, result, aiFeedback)
- **contests** – Contest sessions and scores
- **interviews** – Interview sessions, notes, evaluation, report
- **analytics_events** – Events for analytics

## How to see the data

### 1. In the app (Profile page)

- After login, go to **Dashboard** → **Profile** (or click your username/avatar in the header).
- You’ll see the data that came from the DB for your user: **email**, **username**, **display name**.
- You can edit display name and username there; changes are saved to the **users** collection.

### 2. In MongoDB (direct inspection)

- **Local MongoDB:** Use [MongoDB Compass](https://www.mongodb.com/products/compass), connect to `mongodb://localhost:27017`, open database `codecollab`, collection `users`.
- **MongoDB Atlas:** In the Atlas UI, open your cluster → **Browse Collections** → select your database → `users` collection. You’ll see all user documents (email, username, etc.; password is stored as `passwordHash`).

### 3. Where to look in Atlas Data Explorer (important)

- **Do not** look under `local` or `admin` — those are system DBs. Your app never uses them.
- **Ignore `sample_mflix`** — That database (with users like “Ned Stark”, “Robert Baratheon”, movies, etc.) is **MongoDB Atlas sample/demo data**, not from CodeCollab. Your app does **not** read or write to `sample_mflix`.
- Your app uses the **database name in your connection string**. In `backend/.env` you must have:  
  `MONGODB_URI=mongodb+srv://...mongodb.net/codecollab?retryWrites=...`  
  The part before `?` is the database name: **`codecollab`** (lowercase). If your URI has `sample_mflix` there, change it to **`codecollab`** so the app uses its own clean database.
- In the left pane: under your **CodeCollab** cluster, find the database **`codecollab`**. Open it. You should see:
  - **users** – register/login (your app’s users only)
  - **problems** – DSA problems (seeded on first run)
  - **rooms**, **contests**, **interviews**, **submissions**, **analytics_events**
- If you don’t see a `codecollab` database yet, start the backend once; Atlas will create it when the app first writes data.

### 4. Removing dummy/sample data (clean database for first use)

- **Your app’s data** is only in the **`codecollab`** database. For a clean first use, just ensure your `MONGODB_URI` uses **`codecollab`** (not `sample_mflix`). Then register again in the app; that creates fresh users in `codecollab.users`.
- **To remove Atlas sample data** (the `sample_mflix` database with Ned Stark, movies, etc.):  
  In Atlas Data Explorer → left pane → click the **three dots (⋯)** next to **`sample_mflix`** → **Drop Database**. Confirm. This does not affect your CodeCollab app, which uses `codecollab`.

**Summary:** Your app uses only the **`codecollab`** database (set in `MONGODB_URI`). Ignore or drop **`sample_mflix`**; it is not used by CodeCollab.
