import fetch from 'node-fetch';
import { User, PullRequest, RepoStats } from '../models/index.js';

const { GITHUB_TOKEN } = process.env;
const START_DATE = '2025-10-01T00:00:00Z';
const END_DATE = '2025-12-31T23:59:59Z';

// Helper function to mask sensitive tokens in logs
function maskToken(token) {
  if (!token) return 'NOT_SET';
  return token.substring(0, 7) + '...' + token.substring(token.length - 4);
}

export async function fetchUserPRsFromGitHub(username, accessToken = null) {
  const token = accessToken || GITHUB_TOKEN;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'GitGoPR-Tracker'
  };

  console.log(`🔍 Fetching PRs for ${username} using token ${maskToken(token)}...`);

  let allPRs = [];
  let page = 1;
  const perPage = 100;

  try {
    while (page <= 5) { // Limit to 5 pages for faster response
      const url = `https://api.github.com/search/issues?q=type:pr+author:${username}+created:${START_DATE.split('T')[0]}..${END_DATE.split('T')[0]}&sort=created&order=desc&page=${page}&per_page=${perPage}`;
      
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`❌ GitHub API error (${response.status}): ${response.statusText}`);
        console.error(`   Error details: ${errorBody.substring(0, 200)}`);
        
        if (response.status === 401) {
          console.error(`   ⚠️  Invalid or expired access token`);
        } else if (response.status === 403) {
          console.error(`   ⚠️  Rate limit exceeded or forbidden`);
        }
        break;
      }

      const data = await response.json();
      
      if (data.items.length === 0) {
        break;
      }

      allPRs = allPRs.concat(data.items);
      page++;
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return allPRs;
  } catch (error) {
    console.error('Error fetching PRs from GitHub:', error.message);
    return [];
  }
}

export async function storeUserAndPRs(githubUser) {
  try {
    const username = githubUser.username || githubUser.login;
    const avatarUrl = githubUser.photos?.[0]?.value || githubUser.avatar_url;
    const displayName = githubUser.displayName || githubUser.name;
    const accessToken = githubUser.accessToken;
    const profileUrl = githubUser.profileUrl || githubUser.html_url || `https://github.com/${username}`;

    console.log(`💾 Storing user data for ${username}...`);
    console.log(`   Access Token: ${maskToken(accessToken)}`);

    // Fetch PRs from GitHub using user's access token
    const prs = await fetchUserPRsFromGitHub(username, accessToken);
    console.log(`✅ Found ${prs.length} PRs for ${username}`);

    // Store/update user in database
    console.log(`💾 Updating user ${username} in MongoDB...`);
    const userData = await User.findOneAndUpdate(
      { github_id: String(githubUser.id) },
      {
        github_id: String(githubUser.id),
        username: username,
        display_name: displayName,
        avatar_url: avatarUrl,
        access_token: accessToken,
        profile_url: profileUrl,
        pr_count: prs.length,
        last_updated: new Date()
      },
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true
      }
    );

    console.log(`✅ User stored successfully: ${username} (ID: ${userData._id})`);

    // Delete existing PRs for this user (to update with fresh data)
    await PullRequest.deleteMany({ user_id: userData._id });

    // Store PRs with merged status
    if (prs.length > 0) {
      const prData = prs.map(pr => {
        const isMerged = pr.pull_request?.merged_at != null;
        const state = isMerged ? 'merged' : pr.state;
        
        return {
          user_id: userData._id,
          pr_number: pr.number,
          title: pr.title,
          url: pr.html_url,
          repository: pr.repository_url.split('/').slice(-2).join('/'),
          state: state,
          is_merged: isMerged,
          created_at: new Date(pr.created_at),
          merged_at: isMerged ? new Date(pr.pull_request.merged_at) : null
        };
      });

      await PullRequest.insertMany(prData);
      
      const mergedCount = prData.filter(pr => pr.is_merged).length;
      console.log(`✅ Stored ${prs.length} PRs (${mergedCount} merged) for ${username}`);
    }

    // Fetch and store repo stats
    await fetchAndStoreRepoStats(userData, accessToken);
    return { success: true, user: userData, prCount: prs.length };

  } catch (error) {
    console.error(`❌ Error in storeUserAndPRs for user:`, error.message);
    console.error(`   Stack: ${error.stack?.split('\n').slice(0, 3).join('\n')}`);
    return { success: false, error: error.message };
  }
}

// Fetch repository stats for a user
export async function fetchAndStoreRepoStats(userData, accessToken) {
  try {
    const token = accessToken || GITHUB_TOKEN;
    console.log(`📊 Fetching repository stats for ${userData.username}...`);

    // Get user's repositories
    const repoUrl = `https://api.github.com/users/${userData.username}/repos?sort=updated&per_page=100`;
    const response = await fetch(repoUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitGoPR-Tracker'
      }
    });

    if (!response.ok) {
      console.warn(`⚠️  Could not fetch repos for ${userData.username}: ${response.status}`);
      return { success: false };
    }

    const repos = await response.json();
    console.log(`   Found ${repos.length} repositories`);

    // Delete old repo stats
    await RepoStats.deleteMany({ user_id: userData._id });

    // Store repo stats
    if (repos.length > 0) {
      const repoStatsData = repos.map(repo => ({
        user_id: userData._id,
        repo_name: repo.name,
        full_repo_name: repo.full_name,
        stars: repo.stargazers_count || 0,
        forks: repo.forks_count || 0,
        issues_count: repo.open_issues_count || 0,
        language: repo.language || 'Unknown',
        description: repo.description || '',
        is_fork: repo.fork || false,
        last_updated: new Date()
      }));

      await RepoStats.insertMany(repoStatsData);
      const totalStars = repoStatsData.reduce((sum, r) => sum + r.stars, 0);
      console.log(`✅ Stored stats for ${repos.length} repos (${totalStars} total stars)`);
    }

    return { success: true, repoCount: repos.length };
  } catch (error) {
    console.error(`❌ Error fetching repo stats:`, error.message);
    return { success: false, error: error.message };
  }
}

// Function to refresh a specific user's PR data (for cron jobs)
export async function refreshUserPRs(username) {
  try {
    console.log(`🔄 Refreshing PR data for ${username}...`);
    
    // Get user from database with access token
    const user = await User.findOne({ username: username }).select('+access_token');

    if (!user) {
      console.warn(`⚠️  User ${username} not found in database`);
      return { success: false, error: 'User not found' };
    }

    // Fetch fresh PRs from GitHub using user's access token
    const prs = await fetchUserPRsFromGitHub(username, user.access_token);
    console.log(`   Found ${prs.length} PRs`);

    // Update user's PR count
    await User.findByIdAndUpdate(user._id, {
      pr_count: prs.length,
      last_updated: new Date()
    });

    // Delete old PRs
    await PullRequest.deleteMany({ user_id: user._id });

    // Store fresh PRs with merged status
    if (prs.length > 0) {
      const prData = prs.map(pr => {
        const isMerged = pr.pull_request?.merged_at != null;
        const state = isMerged ? 'merged' : pr.state;
        
        return {
          user_id: user._id,
          pr_number: pr.number,
          title: pr.title,
          url: pr.html_url,
          repository: pr.repository_url.split('/').slice(-2).join('/'),
          state: state,
          is_merged: isMerged,
          created_at: new Date(pr.created_at),
          merged_at: isMerged ? new Date(pr.pull_request.merged_at) : null
        };
      });

      await PullRequest.insertMany(prData);
      
      const mergedCount = prData.filter(pr => pr.is_merged).length;
      console.log(`   Stored ${prs.length} PRs (${mergedCount} merged)`);
    }

    // Refresh repo stats
    await fetchAndStoreRepoStats(user, user.access_token);

    console.log(`✅ Successfully refreshed data for ${username}`);
    return { success: true, prCount: prs.length };

  } catch (error) {
    console.error(`❌ Error refreshing PRs for ${username}:`, error.message);
    return { success: false, error: error.message };
  }
}