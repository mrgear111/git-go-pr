import express from 'express';
import { User, PullRequest, RepoStats } from '../models/index.js';
import { refreshAllUsersPRs } from '../services/backgroundJobs.js';

const router = express.Router();

// Get repository stats for a specific user
router.get('/repos/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const repoStats = await RepoStats.find({ user_id: user._id })
      .sort({ stars: -1, forks: -1 })
      .limit(50);

    const totalStats = {
      total_repos: repoStats.length,
      total_stars: repoStats.reduce((sum, repo) => sum + repo.stars, 0),
      total_forks: repoStats.reduce((sum, repo) => sum + repo.forks, 0),
      total_issues: repoStats.reduce((sum, repo) => sum + repo.issues_count, 0),
      languages: [...new Set(repoStats.map(r => r.language).filter(l => l && l !== 'Unknown'))]
    };

    res.json({
      user: {
        username: user.username,
        display_name: user.display_name,
        avatar_url: user.avatar_url
      },
      stats: totalStats,
      repositories: repoStats
    });
  } catch (error) {
    console.error('Error fetching repo stats:', error);
    res.status(500).json({ error: 'Failed to fetch repository stats' });
  }
});

// Get top repositories across all users
router.get('/repos/top/stars', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const topRepos = await RepoStats.find({ is_fork: false })
      .sort({ stars: -1 })
      .limit(limit)
      .populate('user_id', 'username display_name avatar_url');

    res.json(topRepos);
  } catch (error) {
    console.error('Error fetching top repos:', error);
    res.status(500).json({ error: 'Failed to fetch top repositories' });
  }
});

// Get merged PRs statistics
router.get('/prs/merged/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const mergedPRs = await PullRequest.find({ 
      user_id: user._id,
      is_merged: true 
    }).sort({ merged_at: -1 });

    const stats = {
      total_merged: mergedPRs.length,
      repositories: [...new Set(mergedPRs.map(pr => pr.repository))],
      recent_merged: mergedPRs.slice(0, 10)
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching merged PRs:', error);
    res.status(500).json({ error: 'Failed to fetch merged PRs' });
  }
});

// Manual trigger for cron job (admin only - use password check)
router.post('/refresh/trigger', async (req, res) => {
  try {
    const { admin_password } = req.body;
    
    if (admin_password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('🔧 Manual refresh triggered by admin');
    
    // Run in background
    refreshAllUsersPRs().catch(err => {
      console.error('Background refresh error:', err);
    });

    res.json({ 
      success: true, 
      message: 'PR refresh job triggered. Check server logs for progress.' 
    });
  } catch (error) {
    console.error('Error triggering refresh:', error);
    res.status(500).json({ error: 'Failed to trigger refresh' });
  }
});

// Get global statistics
router.get('/global', async (req, res) => {
  try {
    const [
      totalUsers,
      totalPRs,
      totalMergedPRs,
      totalRepos,
      totalStars
    ] = await Promise.all([
      User.countDocuments(),
      PullRequest.countDocuments(),
      PullRequest.countDocuments({ is_merged: true }),
      RepoStats.countDocuments(),
      RepoStats.aggregate([
        { $group: { _id: null, total: { $sum: '$stars' } } }
      ])
    ]);

    // Get language distribution
    const languageStats = await RepoStats.aggregate([
      { $match: { language: { $ne: '' } } },
      { $group: { _id: '$language', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      users: totalUsers,
      pull_requests: totalPRs,
      merged_prs: totalMergedPRs,
      repositories: totalRepos,
      total_stars: totalStars[0]?.total || 0,
      top_languages: languageStats.map(lang => ({
        language: lang._id,
        count: lang.count
      }))
    });
  } catch (error) {
    console.error('Error fetching global stats:', error);
    res.status(500).json({ error: 'Failed to fetch global statistics' });
  }
});

export default router;
