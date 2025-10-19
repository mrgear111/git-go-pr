# Backend Enhancements - MongoDB Storage & Automated Sync

## 📋 Overview

This document details the comprehensive backend enhancements for GitGoPR, including MongoDB integration, automated PR syncing, repository statistics tracking, and scheduled background jobs.

## 🗄️ MongoDB Schema Design

### 1. **User Schema** (`models/index.js`)

```javascript
{
  github_id: String (unique, indexed),
  username: String (unique, indexed),
  display_name: String,
  avatar_url: String,
  access_token: String (select: false for security),
  profile_url: String,
  full_name: String,
  role: String (enum: ['student', 'instructor', 'admin']),
  college: String,
  year: String,
  instructor: String,
  pr_count: Number,
  last_updated: Date,
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

**Key Features:**
- ✅ `access_token` stored securely (not returned in queries by default)
- ✅ `github_id` as unique identifier
- ✅ Indexed fields for fast queries
- ✅ Timestamps for tracking

### 2. **PullRequest Schema**

```javascript
{
  user_id: ObjectId (ref: User, indexed),
  pr_number: Number,
  title: String,
  url: String,
  repository: String,
  state: String (enum: ['open', 'closed', 'merged']),
  is_merged: Boolean (indexed),
  created_at: Date (indexed),
  merged_at: Date,
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

**Key Features:**
- ✅ Compound unique index on `user_id`, `pr_number`, `repository`
- ✅ Separate `is_merged` flag for easy querying
- ✅ State includes 'merged' option
- ✅ Indexed for performance

### 3. **RepoStats Schema** (NEW)

```javascript
{
  user_id: ObjectId (ref: User, indexed),
  repo_name: String (indexed),
  full_repo_name: String (e.g., "owner/repo"),
  stars: Number,
  forks: Number,
  issues_count: Number,
  language: String,
  description: String,
  is_fork: Boolean,
  last_updated: Date,
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

**Key Features:**
- ✅ Compound unique index on `user_id`, `full_repo_name`
- ✅ Tracks repository popularity metrics
- ✅ Language distribution tracking

## 🔐 OAuth Flow Enhancement

### GitHub Login Process

```
User clicks "Login with GitHub"
         ↓
GitHub OAuth authorization
         ↓
Callback receives authorization code
         ↓
Exchange code for access_token
         ↓
Fetch user profile with token
         ↓
Store/Update user in MongoDB:
  • github_id
  • username
  • avatar_url
  • access_token (encrypted)
  • profile_url
         ↓
Fetch user's PRs from GitHub API
         ↓
Store PRs in MongoDB
         ↓
Fetch repository stats
         ↓
Store repo stats in MongoDB
         ↓
Create user session
         ↓
Redirect to profile/dashboard
```

**Implementation:** `routes/auth.js` + `services/prService.js`

## 📊 Data Fetching & Storage

### PR Fetching (`services/prService.js`)

```javascript
fetchUserPRsFromGitHub(username, accessToken)
```

**Features:**
- ✅ Uses user's personal access token when available
- ✅ Falls back to server GitHub token
- ✅ Searches PRs from Oct 1 - Dec 31, 2025 (Hacktoberfest)
- ✅ Paginated fetching (up to 5 pages, 100 per page)
- ✅ Rate limiting protection (500ms delay between pages)
- ✅ Error handling for 401 (unauthorized) and 403 (rate limit)
- ✅ Token masking in logs for security

**API Query:**
```
GET https://api.github.com/search/issues
  ?q=type:pr+author:{username}+created:2025-10-01..2025-12-31
  &sort=created
  &order=desc
  &page={page}
  &per_page=100
```

### Repository Stats Fetching

```javascript
fetchAndStoreRepoStats(userData, accessToken)
```

**Features:**
- ✅ Fetches up to 100 most recently updated repos
- ✅ Extracts stars, forks, issues count
- ✅ Identifies language and description
- ✅ Marks forked repositories
- ✅ Calculates total stats

**API Query:**
```
GET https://api.github.com/users/{username}/repos
  ?sort=updated
  &per_page=100
```

## ⏰ Automated Cron Jobs

### Hourly PR Refresh (`services/backgroundJobs.js`)

**Schedule:** Every hour at minute 0 (`0 * * * *`)  
**Timezone:** Asia/Kolkata

```javascript
startScheduledJobs()
```

**Process:**
1. Fetch all users from MongoDB
2. For each user:
   - Fetch latest PRs from GitHub using their access_token
   - Update PR count in user document
   - Delete old PR records
   - Insert fresh PR data with merged status
   - Refresh repository statistics
   - 2-second delay between users (rate limiting)
3. Log comprehensive statistics

**Console Output:**
```
═══════════════════════════════════════════════════════════
🔄 Starting scheduled PR & Repo Stats refresh...
⏰ Time: 10/19/2025, 4:00:00 PM
═══════════════════════════════════════════════════════════
📊 Refreshing data for 5 users...

[1/5] 👤 CodeMaverick-143 (previous: 15 PRs)
🔍 Fetching PRs for CodeMaverick-143...
📊 Fetching repository stats...
   ✅ Success: 17 PRs

[2/5] 👤 user2 (previous: 8 PRs)
...

═══════════════════════════════════════════════════════════
✅ Scheduled refresh completed!
📊 Summary:
   • Total users: 5
   • Successful: 5
   • Failed: 0
   • Total PRs: 78
   • Duration: 12.45s
   • Avg time per user: 2.49s
═══════════════════════════════════════════════════════════
```

## 🛠️ API Endpoints

### Stats Routes (`routes/stats.js`)

#### 1. **Get User Repository Stats**
```
GET /stats/repos/:username
```

**Response:**
```json
{
  "user": {
    "username": "CodeMaverick-143",
    "display_name": "Arpit Sarang",
    "avatar_url": "https://..."
  },
  "stats": {
    "total_repos": 45,
    "total_stars": 1250,
    "total_forks": 320,
    "total_issues": 78,
    "languages": ["JavaScript", "Python", "TypeScript"]
  },
  "repositories": [...]
}
```

#### 2. **Get Top Repositories**
```
GET /stats/repos/top/stars?limit=10
```

**Response:** Top starred repositories across all users

#### 3. **Get Merged PRs**
```
GET /stats/prs/merged/:username
```

**Response:**
```json
{
  "total_merged": 12,
  "repositories": ["owner/repo1", "owner/repo2"],
  "recent_merged": [...]
}
```

#### 4. **Manual Cron Trigger** (Admin Only)
```
POST /stats/refresh/trigger
Body: { "admin_password": "your_password" }
```

**Response:**
```json
{
  "success": true,
  "message": "PR refresh job triggered. Check server logs for progress."
}
```

#### 5. **Global Statistics**
```
GET /stats/global
```

**Response:**
```json
{
  "users": 45,
  "pull_requests": 678,
  "merged_prs": 234,
  "repositories": 1250,
  "total_stars": 5600,
  "top_languages": [
    { "language": "JavaScript", "count": 450 },
    { "language": "Python", "count": 320 }
  ]
}
```

## 🔒 Security Features

### Access Token Storage
- ✅ Stored with `select: false` (not returned in normal queries)
- ✅ Masked in all console logs (`ghp_abc...xyz`)
- ✅ Used for authenticated GitHub API calls
- ✅ Separate per-user for better rate limits

### Token Masking
```javascript
function maskToken(token) {
  return token.substring(0, 7) + '...' + token.substring(token.length - 4);
}
// Output: "ghp_abc...xyz"
```

## 📝 Enhanced Logging

### Emoji Indicators
- 🔍 Fetching data
- 💾 Storing/Updating data
- ✅ Success
- ❌ Error
- ⚠️  Warning
- 🔄 Refreshing
- 📊 Statistics
- 🔐 Authentication
- ⏰ Time/Schedule

### Structured Logs
```javascript
console.log(`💾 Storing user data for ${username}...`);
console.log(`   Access Token: ${maskToken(accessToken)}`);
console.log(`✅ Found ${prs.length} PRs for ${username}`);
console.log(`✅ Stored ${prs.length} PRs (${mergedCount} merged)`);
console.log(`📊 Fetching repository stats...`);
console.log(`✅ Stored stats for ${repos.length} repos (${totalStars} total stars)`);
```

## 🧪 Testing

### Test Login Flow
1. Navigate to `http://localhost:4321/login`
2. Click "Login with GitHub"
3. Authorize the app
4. Check server logs for:
   ```
   💾 Storing user data for username...
   ✅ Found 15 PRs
   ✅ Stored 15 PRs (8 merged)
   📊 Fetching repository stats...
   ✅ Stored stats for 45 repos (120 total stars)
   ```
5. Verify in MongoDB:
   ```bash
   mongosh gitgopr
   db.users.find()
   db.pullrequests.find()
   db.repostats.find()
   ```

### Test Manual Cron Trigger
```bash
curl -X POST http://localhost:4000/stats/refresh/trigger \
  -H "Content-Type: application/json" \
  -d '{"admin_password":"your_password"}'
```

### Test Stats Endpoints
```bash
# Get user repo stats
curl http://localhost:4000/stats/repos/CodeMaverick-143

# Get merged PRs
curl http://localhost:4000/stats/prs/merged/CodeMaverick-143

# Get global stats
curl http://localhost:4000/stats/global

# Get top repos
curl http://localhost:4000/stats/repos/top/stars?limit=5
```

### Verify MongoDB Data
```bash
# Count documents
mongosh gitgopr --eval "db.users.countDocuments()"
mongosh gitgopr --eval "db.pullrequests.countDocuments()"
mongosh gitgopr --eval "db.repostats.countDocuments()"

# View specific user
mongosh gitgopr --eval "db.users.findOne({username: 'CodeMaverick-143'})"

# View merged PRs
mongosh gitgopr --eval "db.pullrequests.find({is_merged: true}).count()"

# View top repos by stars
mongosh gitgopr --eval "db.repostats.find().sort({stars: -1}).limit(5)"
```

## 🚀 Deployment Checklist

- [x] MongoDB connection configured
- [x] Mongoose models created
- [x] OAuth callback stores access tokens
- [x] PR fetching with user tokens
- [x] Repo stats fetching implemented
- [x] Cron job scheduled (hourly)
- [x] Manual trigger endpoint (admin)
- [x] Stats API routes added
- [x] Logging enhanced
- [x] Error handling implemented
- [x] Security measures (token masking)
- [x] Testing completed

## 📊 Performance

### Database Indexes
- `users.github_id` - Unique index
- `users.username` - Unique index
- `pullrequests.user_id` - Index
- `pullrequests.state` - Index
- `pullrequests.is_merged` - Index
- `pullrequests.created_at` - Index
- `pullrequests (user_id, pr_number, repository)` - Compound unique index
- `repostats.user_id` - Index
- `repostats.repo_name` - Index
- `repostats (user_id, full_repo_name)` - Compound unique index

### Rate Limiting
- 500ms delay between PR page fetches
- 2-second delay between user refreshes
- Uses user's personal access token (higher rate limit)

## 🔧 Environment Variables

```env
# Required
MONGODB_URI=mongodb://localhost:27017/gitgopr
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_TOKEN=your_github_token
SESSION_SECRET=your_secret

# Optional
ADMIN_PASSWORD=your_admin_password
CLIENT_ORIGIN=http://localhost:4321
NODE_ENV=development
```

## 📈 Monitoring

### Health Checks
```bash
# Server health
curl http://localhost:4000/

# Auth status
curl http://localhost:4000/auth/me

# Global stats
curl http://localhost:4000/stats/global
```

### Logs to Monitor
- OAuth flow completion
- PR fetch counts
- Repo stats updates
- Cron job execution
- Error rates
- API response times

## 🎯 Future Enhancements

- [ ] WebSocket for real-time PR updates
- [ ] GitHub webhook integration for instant sync
- [ ] Advanced analytics dashboard
- [ ] PR quality scoring
- [ ] Contribution graphs
- [ ] Team/organization stats
- [ ] Export data to CSV/JSON
- [ ] Email notifications for milestones

---

**Version:** 2.0.0  
**Last Updated:** October 19, 2025  
**Author:** NST-SDC Dev Club
