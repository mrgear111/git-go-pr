import mongoose from 'mongoose';

// User Schema
const userSchema = new mongoose.Schema({
  github_id: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  display_name: {
    type: String,
    default: ''
  },
  avatar_url: {
    type: String,
    default: ''
  },
  access_token: {
    type: String,
    default: '',
    select: false // Don't return in queries by default for security
  },
  profile_url: {
    type: String,
    default: ''
  },
  full_name: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['student', 'instructor', 'admin'],
    default: 'student'
  },
  college: {
    type: String,
    default: ''
  },
  year: {
    type: String,
    default: ''
  },
  instructor: {
    type: String,
    default: ''
  },
  pr_count: {
    type: Number,
    default: 0
  },
  last_updated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Repository Stats Schema
const repoStatsSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  repo_name: {
    type: String,
    required: true,
    index: true
  },
  full_repo_name: {
    type: String,
    required: true  // e.g., "owner/repo"
  },
  stars: {
    type: Number,
    default: 0
  },
  forks: {
    type: Number,
    default: 0
  },
  issues_count: {
    type: Number,
    default: 0
  },
  language: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  is_fork: {
    type: Boolean,
    default: false
  },
  last_updated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for unique repo per user
repoStatsSchema.index({ user_id: 1, full_repo_name: 1 }, { unique: true });

// Pull Request Schema
const pullRequestSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  pr_number: {
    type: Number,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  repository: {
    type: String,
    required: true
  },
  state: {
    type: String,
    enum: ['open', 'closed', 'merged'],
    required: true,
    index: true
  },
  is_merged: {
    type: Boolean,
    default: false,
    index: true
  },
  created_at: {
    type: Date,
    required: true,
    index: true
  },
  merged_at: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Create compound index for unique constraint
pullRequestSchema.index({ user_id: 1, pr_number: 1, repository: 1 }, { unique: true });

// Create models
const User = mongoose.model('User', userSchema);
const PullRequest = mongoose.model('PullRequest', pullRequestSchema);
const RepoStats = mongoose.model('RepoStats', repoStatsSchema);

export { User, PullRequest, RepoStats };
