<h1 align="center">GitGoPR — Pull Request Tracker</h1>

<p align="center">
  <b>Track, Visualize & Celebrate Your Open-Source Contributions</b><br/>
  Built with 💚 by the <a href="https://nstsdc.org">NST-SDC Dev Club</a>
</p>

<p align="center">
  <a href="https://gitgopr.nstsdc.org"><img src="https://img.shields.io/badge/Live%20Demo-Online-brightgreen?style=for-the-badge"></a>
  <img src="https://img.shields.io/badge/Built%20With-Astro%20%2B%20Express-blue?style=for-the-badge">
  <img src="https://img.shields.io/badge/Database-MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white">
  <img src="https://img.shields.io/badge/Event-Hacktoberfest%202025-FF6B35?style=for-the-badge">
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#documentation">Documentation</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#contributing">Contributing</a>
</p>

---

## 🎯 Overview

**GitGoPR** is a comprehensive platform for tracking and celebrating open-source contributions during Hacktoberfest 2025. Log in with your GitHub account to see your PRs, compete on the leaderboard, and visualize your contribution journey with beautiful GitHub-style charts.

### 🌟 Why GitGoPR?

- **Real-time Tracking**: Automatic sync of your PRs from Oct 1 - Dec 31, 2025
- **Beautiful Visualizations**: GitHub-style contribution calendar with interactive features
- **Competitive Leaderboard**: See how you rank against other contributors
- **Profile Management**: Complete your profile and showcase your achievements
- **Admin Dashboard**: Monitor community activity and user statistics
- **Auto-Refresh**: Hourly cron job keeps your data fresh


## ✨ Features

### 🔐 Authentication
- **GitHub OAuth Login**: Secure authentication with your GitHub account
- **Session Management**: Persistent login sessions with express-session
- **Profile Completion**: Complete your profile with college, year, and role

### 📊 Contribution Tracking
- **Automatic PR Sync**: Fetches all your PRs from GitHub API
- **Date Range**: Tracks PRs from October 1 - December 31, 2025
- **Merged Status Detection**: Automatically identifies merged PRs
- **Repository Stats**: Tracks stars, forks, and issues for your repos
- **Hourly Updates**: Cron job refreshes data every hour

### 📈 Visualizations
- **Contribution Calendar**: GitHub-style heat map showing daily activity
- **Interactive Cells**: Click on any day to see PR details
- **Stats Dashboard**: Total PRs, merged count, and current streak
- **Top Repositories**: Displays your most starred repos
- **Color-coded Intensity**: Visual representation based on contribution count

### 🏆 Leaderboard
- **Global Rankings**: See how you stack up against others
- **Podium Display**: Top 3 contributors featured prominently
- **Merged PR Count**: Rankings based on successfully merged PRs
- **Real-time Updates**: Leaderboard syncs with latest data
- **Dark Theme Design**: Modern, professional UI

### 👤 User Dashboard
- **Profile Overview**: Display name, username, avatar, and stats
- **PR History**: Complete list of all your pull requests
- **Contribution Graph**: Visual representation of your activity
- **Profile Management**: Update your information anytime

### 🛠️ Admin Tools
- **User Monitoring**: View all registered users and their stats
- **Manual Refresh**: Trigger PR sync for all users
- **Activity Dashboard**: Monitor platform usage and trends
- **Password Protected**: Secure admin access

---

## 🌍 Live Demo

🔗 **Visit Now:** [gitgopr.nstsdc.org](https://gitgopr.nstsdc.org)

---

##  Quick Start

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or Atlas)
- GitHub OAuth App ([Create one](https://github.com/settings/developers))
- GitHub Personal Access Token ([Create one](https://github.com/settings/tokens))

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_ORG/git-go-pr-old.git
cd git-go-pr-old
```

### 2. Install Dependencies

**Backend:**
```bash
cd server
npm install
```

**Frontend:**
```bash
cd client
npm install
npm install astro-icon@latest
npm install @iconify-json/heroicons @iconify-json/mdi
```

### 3. Environment Setup

**Server** (`server/.env`):
```env
GITHUB_CLIENT_ID=your_github_oauth_app_id
GITHUB_CLIENT_SECRET=your_github_oauth_secret
GITHUB_TOKEN=your_personal_access_token
GITHUB_CALLBACK_URL=http://localhost:4000/auth/github/callback
MONGODB_URI=mongodb://localhost:27017/gitgopr
SESSION_SECRET=your_random_secret_string
ADMIN_PASSWORD=your_admin_password
CLIENT_ORIGIN=http://localhost:4321
PORT=4000
```

**Client** (`client/.env`):
```env
PUBLIC_API_BASE_URL=http://localhost:4000
```

### 4. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd server
npm start
```
Server runs on `http://localhost:4000`

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```
Client runs on `http://localhost:4321`

### 5. Access the Application

- **Frontend**: http://localhost:4321
- **Backend API**: http://localhost:4000
- **Admin Dashboard**: http://localhost:4321/admindashboard (password: your ADMIN_PASSWORD)

---

## 📚 Documentation

For detailed documentation, please refer to:

- **[SETUP.md](./SETUP.md)** - Complete installation and configuration guide
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - How to contribute to this project
- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - API endpoints reference
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Project structure and architecture

---
## 🧰 Tech Stack

### Frontend
- **Framework**: [Astro](https://astro.build) - Modern static site generator
- **Styling**: [TailwindCSS](https://tailwindcss.com) - Utility-first CSS
- **Icons**: [Astro Icon](https://github.com/natemoo-re/astro-icon) with Heroicons & MDI
- **Components**: Server-side rendered Astro components
- **Build**: Vite-powered development and build

### Backend
- **Runtime**: Node.js with Express.js
- **Authentication**: Passport.js with GitHub OAuth
- **Session Management**: express-session with secure cookies
- **API**: RESTful API architecture
- **Scheduled Jobs**: node-cron for hourly PR sync

### Database
- **Database**: MongoDB with Mongoose ODM
- **Collections**: Users, Pull Requests, Repository Stats
- **Indexes**: Optimized for fast queries
- **Connection**: Persistent connection with automatic retry

### External Services
- **GitHub API**: Fetches user PRs and repository data
- **OAuth**: GitHub OAuth for authentication
- **Deployment**: Vercel (frontend) + Railway (backend)

---

## 🏗️ Project Structure

```
git-go-pr-old/
├── client/                    # Frontend (Astro)
│   ├── public/               # Static assets
│   ├── src/
│   │   ├── components/       # Astro components
│   │   │   └── layout/       # Layout components (Navbar, Footer)
│   │   ├── constants/        # Navigation & config
│   │   ├── layouts/          # Page layouts
│   │   ├── pages/            # Route pages
│   │   ├── styles/           # Global styles
│   │   └── utils/            # Utility functions
│   ├── astro.config.mjs      # Astro configuration
│   └── package.json
│
├── server/                    # Backend (Express)
│   ├── config/               # Configuration files
│   │   ├── database.js       # MongoDB connection
│   │   ├── github-oauth.js   # OAuth setup
│   │   └── passport.js       # Passport config
│   ├── models/               # Mongoose models
│   │   └── index.js          # User, PR, RepoStats schemas
│   ├── routes/               # API routes
│   │   ├── auth.js           # Authentication
│   │   ├── users.js          # User endpoints
│   │   ├── admin.js          # Admin endpoints
│   │   ├── contributions.js  # Contribution data
│   │   └── stats.js          # Statistics
│   ├── services/             # Business logic
│   │   ├── prService.js      # PR fetching & storage
│   │   └── backgroundJobs.js # Cron jobs
│   ├── index.js              # Server entry point
│   └── package.json
│
├── .gitignore                # Git ignore rules
├── README.md                 # This file
└── Documentation files       # Setup, API, etc.
```

---

## 🤝 Contributing

We welcome contributions from the community! Whether it's bug fixes, new features, documentation improvements, or UI enhancements, your help is appreciated.

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes** and test thoroughly
4. **Commit your changes** (`git commit -m 'feat: add amazing feature'`)
5. **Push to your branch** (`git push origin feature/amazing-feature`)
6. **Open a Pull Request**

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

### Contribution Guidelines

- Follow the existing code style
- Write clear commit messages
- Test your changes before submitting
- Update documentation as needed
- One feature per PR

---

## 📜 License

This project is part of the NST-SDC Dev Club initiative for Hacktoberfest 2025.

---

## 👥 Team

Built with 💚 by the **NST-SDC Dev Club**

- **Organization**: [NSTSDC](https://nstsdc.org)
- **GitHub**: [@nst-sdc](https://github.com/nst-sdc)
- **Event**: Hacktoberfest 2025

---

## 🙏 Acknowledgments

- [Hacktoberfest](https://hacktoberfest.com) for inspiring open-source contributions
- [GitHub](https://github.com) for the API and OAuth
- [MongoDB](https://mongodb.com) for the database platform
- All our amazing contributors!

---

## 📧 Contact & Support

- **Website**: [gitgopr.nstsdc.org](https://gitgopr.nstsdc.org)
- **Organization**: [nstsdc.org](https://nstsdc.org)
- **Issues**: [GitHub Issues](https://github.com/YOUR_ORG/git-go-pr-old/issues)

---

<p align="center">
  <b>Made with ❤️ by NST-SDC Dev Club | Hacktoberfest 2025</b>
</p>

<p align="center">
  <img src="https://media.giphy.com/media/du3J3cXyzhj75IOgvA/giphy.gif" width="150" alt="Thank You">
</p>

<p align="center">
  ⭐ Star this repo if you find it helpful!
</p>
