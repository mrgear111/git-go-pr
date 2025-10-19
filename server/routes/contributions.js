import express from 'express';
import { User, PullRequest, RepoStats } from '../models/index.js';

const router = express.Router();

// Get user contributions with GitHub calendar-style data
router.get('/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    // Find user
    const user = await User.findOne({ username }).select('-access_token');
    
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'Please login with GitHub to see your contributions'
      });
    }

    // Get all PRs for this user
    const prs = await PullRequest.find({ user_id: user._id }).sort({ created_at: 1 });
    
    // Get repository stats
    const repoStats = await RepoStats.find({ user_id: user._id });
    
    // Calculate total stats
    const totalPRs = prs.length;
    const totalMergedPRs = prs.filter(pr => pr.is_merged).length;
    const totalStars = repoStats.reduce((sum, repo) => sum + repo.stars, 0);
    const totalRepos = repoStats.length;
    
    // Generate contribution history (group PRs by date)
    const contributionMap = {};
    
    // Initialize all days from Oct 1 to Dec 31, 2025
    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-12-31');
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      contributionMap[dateStr] = {
        date: dateStr,
        count: 0,
        prs: []
      };
    }
    
    // Fill in actual PR data
    prs.forEach(pr => {
      const dateStr = new Date(pr.created_at).toISOString().split('T')[0];
      if (contributionMap[dateStr]) {
        contributionMap[dateStr].count += 1;
        contributionMap[dateStr].prs.push({
          title: pr.title,
          url: pr.url,
          repository: pr.repository,
          state: pr.state,
          is_merged: pr.is_merged
        });
      }
    });
    
    // Convert to array and sort by date
    const contributionHistory = Object.values(contributionMap).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
    
    // Calculate weekly activity
    const weeklyActivity = [];
    for (let i = 0; i < contributionHistory.length; i += 7) {
      const week = contributionHistory.slice(i, i + 7);
      const weekTotal = week.reduce((sum, day) => sum + day.count, 0);
      weeklyActivity.push(weekTotal);
    }
    
    // Find most active day
    const mostActiveDay = contributionHistory.reduce((max, day) => 
      day.count > max.count ? day : max
    , { count: 0, date: null });
    
    // Calculate current streak
    let currentStreak = 0;
    const today = new Date().toISOString().split('T')[0];
    const reversedHistory = [...contributionHistory].reverse();
    
    for (const day of reversedHistory) {
      if (day.date > today) continue; // Skip future dates
      if (day.count > 0) {
        currentStreak++;
      } else {
        break;
      }
    }
    
    // Response data
    res.json({
      user: {
        username: user.username,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        profile_url: user.profile_url || `https://github.com/${user.username}`,
        role: user.role,
        college: user.college,
        year: user.year
      },
      stats: {
        totalPRs,
        totalMergedPRs,
        totalOpenPRs: totalPRs - totalMergedPRs,
        totalRepos,
        totalStars,
        currentStreak,
        longestStreak: currentStreak, // Can be enhanced to track historical streaks
        mostActiveDay: mostActiveDay.count > 0 ? {
          date: mostActiveDay.date,
          count: mostActiveDay.count
        } : null
      },
      contributionHistory,
      weeklyActivity,
      topRepositories: repoStats
        .filter(r => !r.is_fork)
        .sort((a, b) => b.stars - a.stars)
        .slice(0, 5)
        .map(r => ({
          name: r.repo_name,
          full_name: r.full_repo_name,
          stars: r.stars,
          language: r.language
        }))
    });
    
  } catch (error) {
    console.error('Error fetching user contributions:', error);
    res.status(500).json({ 
      error: 'Failed to fetch contributions',
      message: error.message 
    });
  }
});

export default router;
