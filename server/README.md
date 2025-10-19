# GitGoPR Server

A Node.js/Express server for tracking GitHub pull requests during Hacktoberfest 2025.

## 🏗️ Architecture

The server is organized into the following structure:

```
server/
├── config/           # Configuration files
│   ├── database.js   # MongoDB connection
│   └── passport.js   # Passport.js configuration
├── controllers/      # Route controllers (future use)
├── middleware/       # Custom middleware
│   └── auth.js       # Admin authentication
├── models/           # MongoDB models
│   └── index.js      # User and PullRequest models
├── routes/           # API routes
│   ├── auth.js       # Authentication routes
│   ├── users.js      # User management routes
│   ├── admin.js      # Admin-only routes
│   ├── public.js     # Public API routes
│   └── webhooks.js   # GitHub webhook handlers
├── services/         # Business logic
│   ├── prService.js  # GitHub PR fetching
│   └── backgroundJobs.js # Scheduled tasks
├── scripts/          # Utility scripts
│   └── setup-database.js # Database setup
└── index.js          # Main server file
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- MongoDB (local or Atlas)
- GitHub OAuth App

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Set up the database:
```bash
npm run setup-db
```

4. Start the server:
```bash
# Development
npm run dev

# Production
npm start
```

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GITHUB_CLIENT_ID` | GitHub OAuth App Client ID | Yes |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App Client Secret | Yes |
| `GITHUB_TOKEN` | GitHub Personal Access Token | Yes |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `SESSION_SECRET` | Session encryption secret | Yes |
| `ADMIN_PASSWORD` | Admin panel password | Yes |
| `CLIENT_ORIGIN` | Frontend URL | Yes |
| `PORT` | Server port (default: 4000) | No |

## 📡 API Endpoints

### Authentication
- `GET /auth/github` - Start GitHub OAuth flow
- `GET /auth/github/callback` - GitHub OAuth callback
- `GET /auth/me` - Get current user info
- `GET /auth/logout` - Logout user

### User Management
- `POST /user/profile` - Update user profile

### Public API
- `GET /leaderboard` - Get public leaderboard

### Admin API (requires admin password)
- `GET /admin/users` - Get all users
- `GET /admin/users/:userId/prs` - Get user's PRs
- `POST /admin/refresh-all` - Refresh all users' PRs
- `GET /admin/stats` - Get system statistics

### Webhooks
- `POST /webhook/github` - GitHub webhook handler

## 🗄️ Database Schema

### Users Collection
```javascript
{
  github_id: String,      // GitHub user ID
  username: String,       // GitHub username
  display_name: String,   // Display name
  avatar_url: String,     // Profile picture URL
  full_name: String,      // Full name
  role: String,           // student|instructor|admin
  college: String,        // College name
  year: String,           // Academic year
  instructor: String,     // Instructor name
  pr_count: Number,       // Total PR count
  last_updated: Date,     // Last update timestamp
  createdAt: Date,        // Creation timestamp
  updatedAt: Date         // Update timestamp
}
```

### PullRequests Collection
```javascript
{
  user_id: ObjectId,      // Reference to User
  pr_number: Number,      // PR number
  title: String,          // PR title
  url: String,            // PR URL
  repository: String,     // Repository name
  state: String,          // open|closed
  created_at: Date,       // PR creation date
  merged_at: Date,        // PR merge date (null if not merged)
  createdAt: Date,        // Creation timestamp
  updatedAt: Date         // Update timestamp
}
```

## 🔄 Background Jobs

The server runs scheduled jobs to keep data fresh:

- **Hourly PR Refresh**: Updates all users' PR data every hour
- **Initial Refresh**: Runs once on server startup (after 5 seconds)

## 🛡️ Security

- Admin routes protected with password authentication
- GitHub webhook signature verification (optional)
- CORS configured for frontend origin
- Secure session cookies in production

## 🚀 Deployment

The server is designed to work with:
- **Railway** (recommended for backend)
- **Vercel** (for frontend)
- **MongoDB Atlas** (for database)

Make sure to set all environment variables in your deployment platform.
