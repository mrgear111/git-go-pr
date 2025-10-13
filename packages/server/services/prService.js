import models from '../models/index.mjs'
import fetch from 'node-fetch'

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const START_DATE = '2025-10-01T00:00:00Z';
const END_DATE = '2025-12-31T23:59:59Z';

export async function fetchUserPRsFromGitHub(username) {
  const headers = {
    'Authorization': `token ${GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'PR-Tracker'
  };

  let allPRs = [];
  let page = 1;
  const perPage = 100;

  try {
    while (page <= 5) { // Limit to 5 pages for faster response
      const url = `https://api.github.com/search/issues?q=type:pr+author:${username}+created:${START_DATE.split('T')[0]}..${END_DATE.split('T')[0]}&sort=created&order=desc&page=${page}&per_page=${perPage}`;
      
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        console.error(`GitHub API error: ${response.status} ${response.statusText}`);
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
    const username = githubUser.username || githubUser.login
    const prs = await fetchUserPRsFromGitHub(username)

    // Store/update user in MongoDB
    const userData = await models.User.findOneAndUpdate(
      { github_id: githubUser.id },
      { 
        username,
        github_id: githubUser.id
      },
      { upsert: true, new: true }
    )

    // Remove existing PRs and store new ones
    await models.GitHubPR.deleteMany({ author: userData._id })

    // Store PRs
    if (prs.length > 0) {
      const prData = prs.map(pr => ({
        github_id: pr.id,
        title: pr.title,
        author: userData._id,
        link: pr.html_url,
        is_open: pr.state === 'open',
        is_merged: pr.pull_request?.merged_at !== null
      }))

      await models.GitHubPR.insertMany(prData)
    }

    return { success: true, user: userData, prCount: prs.length }

  } catch (error) {
    console.error('Error in storeUserAndPRs:', error);
    return { success: false, error: error.message };
  }
}

export async function refreshUserPRs(username) {
  try {
    const user = await models.User.findOne({ username })
    if (!user) return { success: false, error: 'User not found' }

    const prs = await fetchUserPRsFromGitHub(username)
    
    // Remove old PRs and store new ones
    await models.GitHubPR.deleteMany({ author: user._id })
    
    if (prs.length > 0) {
      const prData = prs.map(pr => ({
        github_id: pr.id,
        title: pr.title,
        author: user._id,
        link: pr.html_url,
        is_open: pr.state === 'open',
        is_merged: pr.pull_request?.merged_at !== null
      }))
      await models.GitHubPR.insertMany(prData)
    }

    return { success: true, prCount: prs.length }
  } catch (error) {
    console.error(`Error refreshing PRs for ${username}:`, error)
    return { success: false, error: error.message }
  }
}
