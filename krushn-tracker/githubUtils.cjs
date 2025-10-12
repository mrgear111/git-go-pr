require('dotenv').config()

const axios = require('axios')

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
if (!GITHUB_TOKEN) {
  console.error('Error: GITHUB_TOKEN is not set in environment variables.')
  process.exit(1)
}

const START_DATE = '2025-10-01T00:00:00Z' // October 1, 2025

async function fetchMergeStatus(prApiUrl) {
  try {
    const response = await axios.get(prApiUrl, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        ...(GITHUB_TOKEN && { Authorization: `token ${GITHUB_TOKEN}` }),
      },
    })
    // The response includes a 'merged' boolean (or you can check merged_at !== null)
    return response.data.merged
  } catch (error) {
    console.error(
      `Error fetching merge status for PR at ${prApiUrl}:`,
      error.message
    )
    // In case of an error, assume the PR was not merged.
    return false
  }
}

async function fetchOwnerDetails(ownerName) {
  try {
    const response = await axios.get(
      `https://api.github.com/users/${ownerName}`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          ...(GITHUB_TOKEN && { Authorization: `token ${GITHUB_TOKEN}` }),
        },
      }
    )
    return response.data
  } catch (error) {
    console.error(
      `Error fetching details for owner ${ownerName}:`,
      error.message
    )
    return null
  }
}

async function fetchRepositoryDetails(ownerName, repoName) {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${ownerName}/${repoName}`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          ...(GITHUB_TOKEN && { Authorization: `token ${GITHUB_TOKEN}` }),
        },
      }
    )
    return response.data
  } catch (error) {
    console.error(
      `Error fetching details for repository ${ownerName}/${repoName}:`,
      error.message
    )
    return null
  }
}

async function fetchUserDetails(username) {
  try {
    const response = await axios.get(
      `https://api.github.com/users/${username}`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          ...(GITHUB_TOKEN && { Authorization: `token ${GITHUB_TOKEN}` }),
        },
      }
    )
    return response.data
  } catch (error) {
    console.error(`Error fetching details for user ${username}:`, error.message)
    return null
  }
}

async function fetchPRsForUser(username) {
  let prRows = []
  let page = 1
  const per_page = 100 // maximum items per page
  while (true) {
    // Build the search query URL.
    // The query 'author:USERNAME is:pr' returns all pull requests created by USERNAME after the lastUpdated date.
    const searchUrl = `https://api.github.com/search/issues?q=author:${username}+is:pr+created:>=${START_DATE}&per_page=${per_page}&page=${page}`
    console.log(`Fetching PRs for ${username} (page ${page})`)
    try {
      const response = await axios.get(searchUrl, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          // Include the token if provided
          ...(GITHUB_TOKEN && { Authorization: `token ${GITHUB_TOKEN}` }),
        },
      })

      const data = response.data
      if (!data.items || data.items.length === 0) {
        break // No more results
      }

      // Process each PR item.
      for (const item of data.items) {
        // The API returns a repository URL like: https://api.github.com/repos/owner/repo
        const repoUrl = item.repository_url
        const parts = repoUrl.split('/')
        // Extract the repository owner (organization or user) and repository name.
        const owner = parts[parts.length - 2]
        const repo = parts[parts.length - 1]
        // Extract the PR details.
        const prLink = item.html_url
        const prStatus = item.state // 'open' or 'closed'
        const prDate = item.created_at // Date the PR was created

        // Determine if the PR was merged.
        // The search API returns an object 'pull_request' with a URL for PR details.
        let prMerged = false
        if (item.pull_request && item.pull_request.url) {
          prMerged = await fetchMergeStatus(item.pull_request.url)
        }

        prRows.push({
          github_id: item.id,
          title: item.title,
          body: item.body,
          username, // the author queried
          owner, // repository owner (org or user)
          repo,
          prLink,
          prStatus,
          prMerged,
          prDate,
        })
      }

      // If we received less than the maximum per_page results, we’re done.
      if (data.items.length < per_page) {
        break
      }

      page++
    } catch (error) {
      console.error(`Error fetching PRs for ${username}:`, error.message)
      break
    }
  }
  return prRows
}

/**
 * Fetch reviews for a specific PR
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} prNumber - PR number
 * @returns {Promise<Array>} Array of review objects
 */
async function fetchPRReviews(owner, repo, prNumber) {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          ...(GITHUB_TOKEN && { Authorization: `token ${GITHUB_TOKEN}` }),
        },
      }
    )
    return response.data
  } catch (error) {
    console.error(
      `Error fetching reviews for PR #${prNumber} in ${owner}/${repo}:`,
      error.message
    )
    return []
  }
}

/**
 * Fetch review comments for a specific PR
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} prNumber - PR number
 * @returns {Promise<Array>} Array of review comment objects
 */
async function fetchPRReviewComments(owner, repo, prNumber) {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/comments`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          ...(GITHUB_TOKEN && { Authorization: `token ${GITHUB_TOKEN}` }),
        },
      }
    )
    return response.data
  } catch (error) {
    console.error(
      `Error fetching review comments for PR #${prNumber} in ${owner}/${repo}:`,
      error.message
    )
    return []
  }
}

/**
 * Fetch requested reviewers for a specific PR
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} prNumber - PR number
 * @returns {Promise<Object>} Object with users and teams arrays
 */
async function fetchRequestedReviewers(owner, repo, prNumber) {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/requested_reviewers`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          ...(GITHUB_TOKEN && { Authorization: `token ${GITHUB_TOKEN}` }),
        },
      }
    )
    return response.data
  } catch (error) {
    console.error(
      `Error fetching requested reviewers for PR #${prNumber} in ${owner}/${repo}:`,
      error.message
    )
    return { users: [], teams: [] }
  }
}

/**
 * Determine review status based on PR data, reviews, and comments
 * @param {Object} prData - PR data object
 * @param {Array} reviews - Array of review objects
 * @param {Array} comments - Array of review comment objects
 * @returns {string} Review status: 'pending', 'in_review', 'approved', 'changes_requested', 'merged'
 */
function determineReviewStatus(prData, reviews, comments) {
  // If PR is merged, status is merged
  if (prData.merged_at || prData.prMerged) {
    return 'merged'
  }

  // Check review states
  const hasChangesRequested = reviews.some((r) => r.state === 'CHANGES_REQUESTED')
  const hasApproved = reviews.some((r) => r.state === 'APPROVED')
  const hasReviews = reviews.length > 0
  const hasComments = comments.length > 0

  // If changes are requested, that takes precedence
  if (hasChangesRequested) {
    return 'changes_requested'
  }

  // If all reviews are approved and there are reviews
  if (hasApproved && !hasChangesRequested) {
    return 'approved'
  }

  // If there are reviews or comments, it's in review
  if (hasReviews || hasComments) {
    return 'in_review'
  }

  // Otherwise, it's pending
  return 'pending'
}

/**
 * Get earliest review start time
 * @param {Array} reviews - Array of review objects
 * @param {Array} comments - Array of review comment objects
 * @returns {Date|null} Earliest review date or null
 */
function getReviewStartedAt(reviews, comments) {
  const dates = []

  // Add review submission dates
  reviews.forEach((review) => {
    if (review.submitted_at) {
      dates.push(new Date(review.submitted_at))
    }
  })

  // Add comment creation dates
  comments.forEach((comment) => {
    if (comment.created_at) {
      dates.push(new Date(comment.created_at))
    }
  })

  if (dates.length === 0) {
    return null
  }

  // Return the earliest date
  return new Date(Math.min(...dates))
}

/**
 * Get unique reviewers from reviews and requested reviewers
 * @param {Array} reviews - Array of review objects
 * @param {Object} requestedReviewers - Object with users and teams
 * @returns {Array<string>} Array of unique reviewer usernames
 */
function getReviewers(reviews, requestedReviewers) {
  const reviewers = new Set()

  // Add reviewers who have submitted reviews
  reviews.forEach((review) => {
    if (review.user && review.user.login) {
      reviewers.add(review.user.login)
    }
  })

  // Add requested reviewers
  if (requestedReviewers && requestedReviewers.users) {
    requestedReviewers.users.forEach((user) => {
      if (user.login) {
        reviewers.add(user.login)
      }
    })
  }

  return Array.from(reviewers)
}

/**
 * Fetch complete review data for a PR
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} prNumber - PR number
 * @param {Object} prData - Basic PR data
 * @returns {Promise<Object>} Complete review data
 */
async function fetchPRReviewData(owner, repo, prNumber, prData) {
  try {
    const [reviews, comments, requestedReviewers] = await Promise.all([
      fetchPRReviews(owner, repo, prNumber),
      fetchPRReviewComments(owner, repo, prNumber),
      fetchRequestedReviewers(owner, repo, prNumber),
    ])

    const reviewStatus = determineReviewStatus(prData, reviews, comments)
    const reviewStartedAt = getReviewStartedAt(reviews, comments)
    const reviewers = getReviewers(reviews, requestedReviewers)
    const reviewCommentsCount = comments.length

    return {
      review_status: reviewStatus,
      review_started_at: reviewStartedAt,
      reviewers: reviewers,
      review_comments_count: reviewCommentsCount,
    }
  } catch (error) {
    console.error(
      `Error fetching review data for PR #${prNumber} in ${owner}/${repo}:`,
      error.message
    )
    return {
      review_status: 'pending',
      review_started_at: null,
      reviewers: [],
      review_comments_count: 0,
    }
  }
}

module.exports = {
  fetchPRsForUser,
  fetchOwnerDetails,
  fetchUserDetails,
  fetchRepositoryDetails,
  fetchMergeStatus,
  fetchPRReviews,
  fetchPRReviewComments,
  fetchRequestedReviewers,
  determineReviewStatus,
  getReviewStartedAt,
  getReviewers,
  fetchPRReviewData,
}
