import express from 'express';
import { User, PullRequest } from '../models/index.js';

const router = express.Router();

// Public leaderboard endpoint - shows users sorted by merged PR count
router.get('/leaderboard', async (req, res) => {
  try {
    // Get users with their merged PR counts
    const users = await User.find({})
      .select('_id username display_name avatar_url pr_count')
      .sort({ pr_count: -1 });

    // Get merged PR counts for each user
    const leaderboard = await Promise.all(
      users.map(async (user) => {
        const mergedCount = await PullRequest.countDocuments({
          user_id: user._id,
          merged_at: { $ne: null }
        });

        return {
          username: user.username,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
          total_prs: user.pr_count,
          merged_prs: mergedCount
        };
      })
    );

    // Sort by merged PRs count (highest first)
    leaderboard.sort((a, b) => b.merged_prs - a.merged_prs);

    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// HACKTOBERFEST ENDPOINTS - Commented out for off-season, uncomment for next Hacktoberfest
// Uncomment the imports at the top: HacktoberfestCache, getHacktoberfestPRs, getHacktoberfestDateRange

/*
// Endpoint to manually refresh Hacktoberfest cache
router.post('/api/refresh-hacktoberfest', async (req, res) => {
  try {
    console.log('🔄 Manually refreshing Hacktoberfest cache...');
    
    const { year } = getHacktoberfestDateRange();
    const users = await User.find({}).select('username');
    
    // Clear MongoDB cache for current year
    const deleteResult = await HacktoberfestCache.deleteMany({ year });
    
    res.json({
      success: true,
      message: `Cache cleared for ${deleteResult.deletedCount} users. Will refresh on next leaderboard request.`,
      users: users.length,
      deleted: deleteResult.deletedCount,
      year
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Hacktoberfest cache status
router.get('/api/hacktoberfest-status', async (req, res) => {
  try {
    const { year } = getHacktoberfestDateRange();
    const now = Date.now();
    const cacheMaxAge = 12 * 60 * 60 * 1000; // 12 hours
    
    // Get all cached entries for current year
    const cachedEntries = await HacktoberfestCache.find({ year }).select('username updatedAt count apiCalls');
    
    // Calculate stats
    const validCache = cachedEntries.filter(entry => 
      (now - new Date(entry.updatedAt).getTime()) < cacheMaxAge
    );
    
    const oldestCache = cachedEntries.length > 0 
      ? Math.min(...cachedEntries.map(e => new Date(e.updatedAt).getTime()))
      : null;
    
    const newestCache = cachedEntries.length > 0
      ? Math.max(...cachedEntries.map(e => new Date(e.updatedAt).getTime()))
      : null;
    
    const totalApiCalls = cachedEntries.reduce((sum, e) => sum + (e.apiCalls || 0), 0);
    const totalPRs = cachedEntries.reduce((sum, e) => sum + (e.count || 0), 0);
    
    res.json({
      year,
      total_cached: cachedEntries.length,
      valid_cache: validCache.length,
      expired_cache: cachedEntries.length - validCache.length,
      oldest_entry: oldestCache ? new Date(oldestCache).toISOString() : null,
      newest_entry: newestCache ? new Date(newestCache).toISOString() : null,
      cache_age_hours: oldestCache ? ((now - oldestCache) / 1000 / 60 / 60).toFixed(1) : null,
      ttl_hours: 12,
      total_api_calls: totalApiCalls,
      total_hacktoberfest_prs: totalPRs,
      top_contributors: cachedEntries
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(e => ({ username: e.username, count: e.count }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
*/

// Top weekly contributors endpoint - shows top 3 contributors from the past 7 days
router.get('/api/top-contributors', async (req, res) => {
  try {
    // Calculate date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get all PRs merged in the last 7 days
    const recentPRs = await PullRequest.find({
      merged_at: { $gte: sevenDaysAgo, $ne: null }
    }).select('user_id');

    // Count PRs per user
    const userPRCounts = {};
    recentPRs.forEach(pr => {
      const userId = pr.user_id.toString();
      userPRCounts[userId] = (userPRCounts[userId] || 0) + 1;
    });

    // Get top 3 user IDs
    const topUserIds = Object.entries(userPRCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([userId]) => userId);

    // Fetch user details for top contributors
    const topContributors = await Promise.all(
      topUserIds.map(async (userId) => {
        const user = await User.findById(userId).select('username display_name avatar_url');
        return {
          username: user.username,
          displayName: user.display_name,
          avatar: user.avatar_url,
          count: userPRCounts[userId]
        };
      })
    );

    // Calculate week range
    const weekStart = sevenDaysAgo.toISOString().split('T')[0];
    const weekEnd = new Date().toISOString().split('T')[0];

    res.json({
      contributors: topContributors,
      weekStart,
      weekEnd
    });
  } catch (error) {
    console.error('Error fetching top contributors:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
