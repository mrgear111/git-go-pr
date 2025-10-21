import fetch from 'node-fetch';

/**
 * GitHub Service for fetching Hacktoberfest PRs
 * Uses GitHub GraphQL API for efficient querying
 */

const GITHUB_API_URL = 'https://api.github.com/graphql';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GITHUB_CLIENT_SECRET;

/**
 * Get current Hacktoberfest date range (October 1-31 of current year)
 */
function getHacktoberfestDateRange() {
  const currentYear = new Date().getFullYear();
  return {
    start: `${currentYear}-10-01`,
    end: `${currentYear}-10-31`,
    year: currentYear
  };
}

/**
 * Fetch Hacktoberfest PRs for a specific user using GitHub GraphQL API
 * Implements pagination, private repo filtering, and comprehensive eligibility checks
 * @param {string} username - GitHub username
 * @param {Object} options - { useCache: true, retryOnError: true }
 * @returns {Promise<Object>} - { count, prs, year, cached, apiCalls }
 */
export async function getHacktoberfestPRs(username, options = {}) {
  const { useCache = true, retryOnError = true } = options;
  const { start, end, year } = getHacktoberfestDateRange();
  
  // GraphQL query with pagination support and enhanced fields
  const query = `
    query($searchQuery: String!, $cursor: String) {
      search(query: $searchQuery, type: ISSUE, first: 100, after: $cursor) {
        issueCount
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          ... on PullRequest {
            id
            title
            number
            url
            createdAt
            mergedAt
            merged
            repository {
              name
              url
              isPrivate
              owner { login }
              repositoryTopics(first: 30) {
                nodes {
                  topic { name }
                }
              }
            }
            labels(first: 30) {
              nodes {
                name
              }
            }
          }
        }
      }
    }
  `;

  // Build search query: merged PRs in October by this user
  const searchQuery = `is:pr is:merged created:${start}..${end} author:${username}`;

  let allPRs = [];
  let hasNextPage = true;
  let cursor = null;
  let apiCalls = 0;
  const maxPages = 2; // Fetch up to 200 PRs (100 per page)

  try {
    // Fetch PRs with pagination
    while (hasNextPage && apiCalls < maxPages) {
      const response = await fetchWithRetry(GITHUB_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          'User-Agent': 'GitGoPR-App'
        },
        body: JSON.stringify({
          query,
          variables: { searchQuery, cursor }
        })
      }, retryOnError);

      apiCalls++;

      if (!response.ok) {
        console.error(`GitHub API error for ${username}:`, response.status, response.statusText);
        
        // If rate limited and retry enabled, try REST API fallback
        if (response.status === 403 && retryOnError) {
          console.log(`Rate limited, falling back to REST API for ${username}`);
          return await getHacktoberfestPRsREST(username);
        }
        
        return { count: 0, prs: [], year, error: 'api_error', apiCalls };
      }

      const data = await response.json();

      if (data.errors) {
        console.error(`GraphQL errors for ${username}:`, data.errors);
        return { count: 0, prs: [], year, error: 'graphql_error', apiCalls };
      }

      const pageData = data.data?.search;
      if (!pageData) {
        break;
      }

      allPRs = allPRs.concat(pageData.nodes || []);
      hasNextPage = pageData.pageInfo?.hasNextPage || false;
      cursor = pageData.pageInfo?.endCursor;

      // Small delay between pages to respect rate limits
      if (hasNextPage) {
        await delay(300);
      }
    }
    
    // Filter PRs that are Hacktoberfest-eligible
    const eligiblePRs = allPRs
      .filter(pr => isHacktoberfestEligible(pr, start, end))
      .map(pr => ({
        title: pr.title,
        number: pr.number,
        url: pr.url,
        repository: `${pr.repository.owner.login}/${pr.repository.name}`,
        repositoryUrl: pr.repository.url,
        createdAt: pr.createdAt,
        mergedAt: pr.mergedAt,
        labels: pr.labels.nodes.map(l => l.name),
        topics: pr.repository.repositoryTopics.nodes.map(t => t.topic.name),
        isPrivate: pr.repository.isPrivate
      }));

    return {
      count: eligiblePRs.length,
      prs: eligiblePRs,
      year,
      cached: false,
      apiCalls,
      totalFetched: allPRs.length
    };
  } catch (error) {
    console.error(`Error fetching Hacktoberfest PRs for ${username}:`, error.message);
    
    // Fallback to REST API if GraphQL fails
    if (retryOnError) {
      console.log(`GraphQL failed, trying REST API for ${username}`);
      return await getHacktoberfestPRsREST(username);
    }
    
    return { count: 0, prs: [], year, error: error.message, apiCalls };
  }
}

/**
 * Check if a PR is Hacktoberfest-eligible (matches official Hacktoberfest criteria)
 * 
 * Criteria:
 * 1. PR must be merged (not just closed)
 * 2. Created during October (Oct 1-31)
 * 3. Repository must be public
 * 4. Either:
 *    - Repository has 'hacktoberfest' topic, OR
 *    - PR has 'hacktoberfest' or 'hacktoberfest-accepted' label
 * 
 * @param {Object} pr - Pull request object from GitHub API
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {boolean}
 */
function isHacktoberfestEligible(pr, startDate, endDate) {
  if (!pr) return false;

  // Must be merged (not just closed)
  if (!pr.merged || !pr.mergedAt) return false;

  // Must be created during October
  const createdAt = new Date(pr.createdAt);
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999); // Include entire last day
  
  if (createdAt < start || createdAt > end) return false;

  // Must be public repository
  if (pr.repository?.isPrivate) return false;

  // Check repository topics
  const topics = pr.repository?.repositoryTopics?.nodes?.map(t => t.topic.name.toLowerCase()) || [];
  const hasHacktoberfestTopic = topics.includes('hacktoberfest');

  // Check PR labels
  const labels = pr.labels?.nodes?.map(l => l.name.toLowerCase()) || [];
  const hasHacktoberfestLabel = labels.some(label => 
    label === 'hacktoberfest' || 
    label === 'hacktoberfest-accepted'
  );

  return hasHacktoberfestTopic || hasHacktoberfestLabel;
}

/**
 * Fetch with exponential backoff retry logic
 * @param {string} url - API URL
 * @param {Object} options - Fetch options
 * @param {boolean} retry - Enable retry
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, options, retry = true, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // If rate limited (403) or abuse detection (429), retry with backoff
      if ((response.status === 403 || response.status === 429) && retry && attempt < maxRetries) {
        const retryAfter = response.headers.get('Retry-After') || Math.pow(2, attempt);
        const delayMs = parseInt(retryAfter) * 1000;
        
        console.log(`Rate limited, retrying after ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`);
        await delay(delayMs);
        continue;
      }
      
      return response;
    } catch (error) {
      lastError = error;
      
      if (retry && attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`Fetch error, retrying after ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`);
        await delay(delayMs);
        continue;
      }
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

/**
 * Delay helper function
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch Hacktoberfest PRs for multiple users (batch operation with throttling)
 * @param {Array<string>} usernames - Array of GitHub usernames
 * @param {Object} options - { batchSize: 10, delayMs: [250, 500] }
 * @returns {Promise<Object>} - { results: {}, totalApiCalls: 0, errors: [] }
 */
export async function getHacktoberfestPRsBatch(usernames, options = {}) {
  const { batchSize = 10, delayMs = [250, 500] } = options;
  const results = {};
  const errors = [];
  let totalApiCalls = 0;
  
  console.log(`📊 Batch processing ${usernames.length} users (${batchSize} at a time)...`);
  
  // Process in batches with parallel execution
  for (let i = 0; i < usernames.length; i += batchSize) {
    const batch = usernames.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(usernames.length / batchSize);
    
    console.log(`🔄 Processing batch ${batchNum}/${totalBatches} (${batch.length} users)...`);
    
    // Parallel execution within batch
    const promises = batch.map(username => 
      getHacktoberfestPRs(username, { useCache: true, retryOnError: true })
        .then(data => ({ username, data, success: true }))
        .catch(error => {
          console.error(`❌ Error for ${username}:`, error.message);
          return { 
            username, 
            data: { count: 0, prs: [], error: error.message }, 
            success: false 
          };
        })
    );
    
    const batchResults = await Promise.all(promises);
    
    batchResults.forEach(({ username, data, success }) => {
      results[username] = data;
      totalApiCalls += data.apiCalls || 0;
      
      if (!success) {
        errors.push({ username, error: data.error });
      }
    });

    // Random delay between batches to avoid rate limiting
    if (i + batchSize < usernames.length) {
      const randomDelay = Math.floor(Math.random() * (delayMs[1] - delayMs[0]) + delayMs[0]);
      console.log(`⏳ Waiting ${randomDelay}ms before next batch...`);
      await delay(randomDelay);
    }
  }
  
  console.log(`✅ Batch complete: ${Object.keys(results).length} users, ${totalApiCalls} API calls, ${errors.length} errors`);

  return {
    results,
    totalApiCalls,
    errors,
    successRate: ((usernames.length - errors.length) / usernames.length * 100).toFixed(1) + '%'
  };
}

/**
 * Fetch Hacktoberfest PRs using REST API (fallback method)
 * @param {string} username - GitHub username
 * @returns {Promise<Object>}
 */
export async function getHacktoberfestPRsREST(username) {
  const { start, end, year } = getHacktoberfestDateRange();
  
  // REST API search query
  const searchQuery = `is:pr is:merged created:${start}..${end} author:${username}`;
  const url = `https://api.github.com/search/issues?q=${encodeURIComponent(searchQuery)}&per_page=100`;

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitGoPR-App'
      }
    });

    if (!response.ok) {
      console.error(`GitHub REST API error for ${username}:`, response.status);
      return { count: 0, prs: [], year, error: 'api_error' };
    }

    const data = await response.json();
    const prs = data.items || [];

    // For REST API, we need to fetch repository details separately
    // This is less efficient, so GraphQL is preferred
    const eligiblePRs = [];
    
    for (const pr of prs) {
      // Check labels
      const labels = pr.labels?.map(l => l.name.toLowerCase()) || [];
      const hasHacktoberfestLabel = labels.some(label => 
        label === 'hacktoberfest' || 
        label === 'hacktoberfest-accepted'
      );

      if (hasHacktoberfestLabel) {
        eligiblePRs.push({
          title: pr.title,
          number: pr.number,
          url: pr.html_url,
          repository: pr.repository_url.split('/').slice(-2).join('/'),
          mergedAt: pr.pull_request?.merged_at,
          labels: labels
        });
      }
    }

    return {
      count: eligiblePRs.length,
      prs: eligiblePRs,
      year
    };
  } catch (error) {
    console.error(`Error fetching Hacktoberfest PRs (REST) for ${username}:`, error.message);
    return { count: 0, prs: [], year, error: error.message };
  }
}

export default {
  getHacktoberfestPRs,
  getHacktoberfestPRsBatch,
  getHacktoberfestPRsREST,
  getHacktoberfestDateRange
};
