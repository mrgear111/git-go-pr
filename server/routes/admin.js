import express from 'express';
import { User, PullRequest } from '../models/index.js';
import { refreshUserPRs } from '../services/prService.js';
import { requireAdminAuth } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require authentication
router.use(requireAdminAuth);

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({})
      .sort({ pr_count: -1 });

    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get PRs for a specific user
router.get('/users/:userId/prs', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const prs = await PullRequest.find({ user_id: userId })
      .sort({ created_at: -1 });

    res.json({ prs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual refresh endpoint for admin
router.post('/refresh-all', async (req, res) => {
  try {
    console.log('🔄 Manual refresh triggered by admin...');
    
    // Get all users from database
    const users = await User.find({}).select('username');
    
    if (!users || users.length === 0) {
      return res.json({ message: 'No users to refresh', usersRefreshed: 0 });
    }
    
    // Refresh each user's PRs
    let successCount = 0;
    let errorCount = 0;
    
    for (const user of users) {
      try {
        console.log(`  → Refreshing ${user.username}...`);
        await refreshUserPRs(user.username);
        successCount++;
        
        // Small delay between users to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`  ✗ Error refreshing ${user.username}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`✅ Manual refresh completed! Success: ${successCount}, Errors: ${errorCount}`);
    
    res.json({ 
      message: 'Refresh completed',
      usersRefreshed: successCount,
      errors: errorCount,
      total: users.length
    });
  } catch (error) {
    console.error('Error in manual refresh:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get admin statistics
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalPRs = await PullRequest.countDocuments();
    const openPRs = await PullRequest.countDocuments({ state: 'open' });
    const mergedPRs = await PullRequest.countDocuments({ merged_at: { $ne: null } });

    res.json({
      totalUsers,
      totalPRs,
      openPRs,
      mergedPRs,
      averagePRsPerUser: totalUsers > 0 ? (totalPRs / totalUsers).toFixed(2) : 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
