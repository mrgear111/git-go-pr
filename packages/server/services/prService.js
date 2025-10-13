import { supabase } from '../supabase.js';
import fetch from 'node-fetch';

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
    const username = githubUser.username || githubUser.login;
    const avatarUrl = githubUser.photos?.[0]?.value || githubUser.avatar_url;
    const displayName = githubUser.displayName || githubUser.name;

    // Fetch PRs from GitHub
    console.log(`Fetching PRs for ${username}...`);
    const prs = await fetchUserPRsFromGitHub(username);
    console.log(`Found ${prs.length} PRs`);

    // Store/update user in database
    console.log('Attempting to store user in Supabase...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .upsert({
        github_id: String(githubUser.id),
        username: username,
        display_name: displayName,
        avatar_url: avatarUrl,
        pr_count: prs.length,
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'github_id'
      })
      .select()
      .single();

    if (userError) {
      console.error('Error storing user:', userError);
      console.error('Full error details:', JSON.stringify(userError, null, 2));
      return { success: false, error: userError };
    }

    console.log('User stored successfully:', userData);

    // Delete existing PRs for this user (to update with fresh data)
    await supabase
      .from('pull_requests')
      .delete()
      .eq('user_id', userData.id);

    // Store PRs
    if (prs.length > 0) {
      const prData = prs.map(pr => ({
        user_id: userData.id,
        pr_number: pr.number,
        title: pr.title,
        url: pr.html_url,
        repository: pr.repository_url.split('/').slice(-2).join('/'),
        state: pr.state,
        created_at: pr.created_at,
        merged_at: pr.pull_request?.merged_at || null
      }));

      const { error: prError } = await supabase
        .from('pull_requests')
        .insert(prData);

      if (prError) {
        console.error('Error storing PRs:', prError);
      }
    }

    console.log(`Stored ${prs.length} PRs for user ${username}`);
    return { success: true, user: userData, prCount: prs.length };

  } catch (error) {
    console.error('Error in storeUserAndPRs:', error);
    return { success: false, error: error.message };
  }
}

// Function to refresh a specific user's PR data (for webhooks)
export async function refreshUserPRs(username) {
  try {
    console.log(`Refreshing PR data for ${username}...`);
    
    // Get user from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (userError || !user) {
      console.log(`User ${username} not found in database`);
      return { success: false, error: 'User not found' };
    }

    // Fetch fresh PRs from GitHub
    const prs = await fetchUserPRsFromGitHub(username);
    console.log(`Found ${prs.length} PRs for ${username}`);

    // Update user's PR count
    await supabase
      .from('users')
      .update({
        pr_count: prs.length,
        last_updated: new Date().toISOString()
      })
      .eq('id', user.id);

    // Delete old PRs
    await supabase
      .from('pull_requests')
      .delete()
      .eq('user_id', user.id);

    // Store fresh PRs
    if (prs.length > 0) {
      const prData = prs.map(pr => ({
        user_id: user.id,
        pr_number: pr.number,
        title: pr.title,
        url: pr.html_url,
        repository: pr.repository_url.split('/').slice(-2).join('/'),
        state: pr.state,
        created_at: pr.created_at,
        merged_at: pr.pull_request?.merged_at || null
      }));

      await supabase
        .from('pull_requests')
        .insert(prData);
    }

    console.log(`Successfully refreshed PR data for ${username}`);
    return { success: true, prCount: prs.length };

  } catch (error) {
    console.error(`Error refreshing PRs for ${username}:`, error);
    return { success: false, error: error.message };
  }
}
