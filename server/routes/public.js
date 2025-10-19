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

export default router;
