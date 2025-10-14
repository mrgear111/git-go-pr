
# 🚀 GIT GO PR — Pull Request Tracker

Track your open-source pull requests during Hacktoberfest 2025 🌸
  
Built with 💖 by the [NST Student Developer Club](https://nstsdc.org)

[![Live Demo - Online](https://img.shields.io/badge/Live%20Demo-Online-green?style=for-the-badge)](https://gitgopr.nstsdc.org)
![Built With Astro + Express](https://img.shields.io/badge/Built%20With-Astro%20%2B%20Express-blue?style=for-the-badge)
![Database: MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Hacktoberfest 2025 Badge](https://img.shields.io/badge/Event-Hacktoberfest%202025-orange?style=for-the-badge)

---

## 🧠 Overview

GITGOPR helps developers **track, visualize, and celebrate** their pull requests throughout **October 2025**.  
Log in with your GitHub account to see your PRs, leaderboard rank, and contribution stats in one dashboard.

## ⚙️ Features at a Glance

- Login with GitHub
- Tracks your PRs from Oct 1-31, 2025
- Shows leaderboard of contributors
- Admin dashboard for monitoring

## 🌍 Live Site

🔗 **Visit Now:** [gitgopr.nstsdc.org](https://gitgopr.nstsdc.org)

---

## 🖼️ Demo Preview

> 🪄 *See your PRs come alive — real-time tracking, leaderboard updates, and beautiful analytics dashboard.*
---

## ⚡ Setup

### Frontend (Astro)

```bash
cd packages/client
npm install
npm run dev
```

### Backend (Node.js)

```bash
cd packages/server  
npm install
npm start
```

## 🔐 Environment Variables

### Server (.env)

- `MONGODB_URI` — MongoDB connection string
- `GITHUB_CLIENT_ID` — OAuth app ID  
- `GITHUB_CLIENT_SECRET` — OAuth secret  
- `GITHUB_TOKEN` — Personal access token  
- `SESSION_SECRET` — Session encryption  
- `ADMIN_PASSWORD` — Admin access password
- `CLIENT_ORIGIN` — Frontend URL

### Client (.env)  

- `PUBLIC_API_BASE_URL` - Backend URL

Uses MongoDB with Mongoose. The application automatically creates the required collections and indexes on startup

---

## 🧰 Tech Stack

| Layer | Tools & Frameworks |
|-------|---------------------|
| 🌐 Frontend | [Astro](https://astro.build) + [TailwindCSS](https://tailwindcss.com) |
| ⚙️ Backend | [Express.js](https://expressjs.com) + [Passport.js](https://www.passportjs.org/) |
| 🗄️ Database | [MongoDB](https://mongodb.com) + [Mongoose](https://mongoosejs.com) |
| ☁️ Deployment | [Vercel](https://vercel.com) + [Railway](https://railway.app) |

---

## 🤝 Contributing

Pull requests are welcome!  
If you'd like to improve the project, feel free to fork and submit a PR.

---

Made with ❤️ by [NSTSDC Dev Club](https://nstsdc.org) | October 2025

![thank you gif](https://media.giphy.com/media/du3J3cXyzhj75IOgvA/giphy.gif)
