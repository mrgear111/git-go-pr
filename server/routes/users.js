import express from 'express';
import { User, PullRequest, RepoStats } from '../models/index.js';

const router = express.Router();

// Get user profile details by username (public endpoint)
router.get('/:username', async (req, res) => {
  try {
    const { username } = req.params;

    // Fetch user from MongoDB
    const user = await User.findOne({ username: username });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Fetch all PRs for this user
    const prs = await PullRequest.find({ username: username })
      .sort({ created_at: -1 })
      .lean();

    // Fetch repository stats
    const repoStats = await RepoStats.find({ username: username })
      .sort({ stars: -1 })
      .limit(10)
      .lean();

    // Calculate statistics
    const totalPRs = prs.length;
    const mergedPRs = prs.filter(pr => pr.merged).length;
    const totalStars = repoStats.reduce((sum, repo) => sum + (repo.stars || 0), 0);
    const totalIssues = repoStats.reduce((sum, repo) => sum + (repo.issues || 0), 0);

    // Extract languages from PRs
    const languageMap = {};
    prs.forEach(pr => {
      if (pr.language) {
        languageMap[pr.language] = (languageMap[pr.language] || 0) + 1;
      }
    });
    const topLanguages = Object.entries(languageMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Extract unique organizations
    const orgSet = new Set();
    prs.forEach(pr => {
      if (pr.repo_full_name) {
        const owner = pr.repo_full_name.split('/')[0];
        if (owner !== username) {
          orgSet.add(owner);
        }
      }
    });
    const organizations = Array.from(orgSet).slice(0, 10);

    // Generate contribution history (group by date)
    const contributionMap = {};
    prs.forEach(pr => {
      const date = new Date(pr.created_at).toISOString().split('T')[0];
      contributionMap[date] = (contributionMap[date] || 0) + 1;
    });
    const contributionHistory = Object.entries(contributionMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Format PR list for response
    const prList = prs.map(pr => ({
      id: pr._id,
      title: pr.title,
      repo: pr.repo_full_name,
      status: pr.merged ? 'merged' : pr.state,
      created_at: pr.created_at,
      html_url: pr.html_url,
      language: pr.language
    }));

    // Calculate current streak
    let currentStreak = 0;
    const today = new Date().toISOString().split('T')[0];
    const sortedDates = Object.keys(contributionMap).sort().reverse();
    
    for (let i = 0; i < sortedDates.length; i++) {
      const date = sortedDates[i];
      const daysDiff = Math.floor((new Date(today) - new Date(date)) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === i) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Prepare response
    const profileData = {
      username: user.username,
      displayName: user.display_name || user.username,
      fullName: user.full_name,
      avatarUrl: user.avatar_url,
      bio: user.bio,
      location: user.location,
      company: user.company,
      blog: user.blog,
      role: user.role,
      college: user.college,
      year: user.year,
      totalPRs,
      mergedPRs,
      totalStars,
      totalIssues,
      currentStreak,
      reposContributedTo: repoStats.length,
      organizations,
      topLanguages,
      contributionHistory,
      prs: prList,
      topRepositories: repoStats.map(repo => ({
        name: repo.full_name,
        stars: repo.stars,
        forks: repo.forks,
        issues: repo.issues,
        language: repo.language
      }))
    };

    res.json(profileData);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user profile (full_name, role, college, year, instructor) - requires user session
router.post('/profile', express.json(), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { full_name, role, college, year, instructor } = req.body;
    const username = req.user.username || req.user.login;

    // Update the user in MongoDB
    const user = await User.findOneAndUpdate(
      { username: username },
      {
        full_name: full_name || '',
        role: role || 'student',
        college: college || '',
        year: year || '',
        instructor: instructor || '',
        last_updated: new Date()
      },
      { new: true }
    );

    if (!user) {
      console.error('Error updating profile: User not found');
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error('Error in /user/profile:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
