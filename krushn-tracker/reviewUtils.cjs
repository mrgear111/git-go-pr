const { GitHubPR } = require('./models')

/**
 * Calculate review time metrics for a PR
 * @param {Object} pr - PR object from database
 * @returns {Object} Review time metrics
 */
function calculateReviewMetrics(pr) {
  const metrics = {
    timeToFirstReview: null,
    totalReviewTime: null,
    isStuck: false,
  }

  if (!pr.review_started_at) {
    return metrics
  }

  const createdAt = new Date(pr.createdAt)
  const reviewStartedAt = new Date(pr.review_started_at)

  // Time from PR creation to first review (in hours)
  metrics.timeToFirstReview = (reviewStartedAt - createdAt) / (1000 * 60 * 60)

  // If PR is still open and in review, calculate time in review
  if (pr.is_open && pr.review_status === 'in_review') {
    const now = new Date()
    metrics.totalReviewTime = (now - reviewStartedAt) / (1000 * 60 * 60)

    // Consider stuck if in review for more than 7 days (168 hours)
    metrics.isStuck = metrics.totalReviewTime > 168
  } else if (pr.is_merged || !pr.is_open) {
    const endTime = pr.updatedAt ? new Date(pr.updatedAt) : new Date()
    metrics.totalReviewTime = (endTime - reviewStartedAt) / (1000 * 60 * 60)
  }

  return metrics
}

/**
 * Get review bottleneck analysis
 * @returns {Promise<Object>} Bottleneck analysis data
 */
async function getReviewBottlenecks() {
  try {
    // Find PRs stuck in review (> 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const stuckPRs = await GitHubPR.find({
      is_open: true,
      review_status: { $in: ['in_review', 'changes_requested'] },
      review_started_at: { $lte: sevenDaysAgo },
    })
      .populate({
        path: 'author',
        select: 'username full_name',
      })
      .populate({
        path: 'repository',
        populate: { path: 'owner', select: 'username name' },
      })
      .sort({ review_started_at: 1 })

    // Calculate metrics for stuck PRs
    const stuckPRsWithMetrics = stuckPRs.map((pr) => {
      const metrics = calculateReviewMetrics(pr)
      return {
        id: pr._id,
        github_id: pr.github_id,
        title: pr.title,
        link: pr.link,
        author: pr.author,
        repository: pr.repository,
        review_status: pr.review_status,
        review_started_at: pr.review_started_at,
        reviewers: pr.reviewers,
        review_comments_count: pr.review_comments_count,
        daysInReview: Math.floor(metrics.totalReviewTime / 24),
        hoursInReview: Math.floor(metrics.totalReviewTime),
      }
    })

    // Group by repository
    const byRepository = {}
    stuckPRsWithMetrics.forEach((pr) => {
      const repoName = pr.repository ? `${pr.repository.owner.username}/${pr.repository.name}` : 'Unknown'
      if (!byRepository[repoName]) {
        byRepository[repoName] = []
      }
      byRepository[repoName].push(pr)
    })

    return {
      totalStuckPRs: stuckPRsWithMetrics.length,
      stuckPRs: stuckPRsWithMetrics,
      byRepository,
    }
  } catch (error) {
    console.error('Error getting review bottlenecks:', error)
    throw error
  }
}

/**
 * Calculate average review time metrics
 * @returns {Promise<Object>} Average metrics
 */
async function calculateAverageReviewTime() {
  try {
    const prs = await GitHubPR.find({
      review_started_at: { $ne: null },
    })

    let totalTimeToFirstReview = 0
    let totalReviewTime = 0
    let countWithFirstReview = 0
    let countWithTotalReview = 0

    prs.forEach((pr) => {
      const metrics = calculateReviewMetrics(pr)

      if (metrics.timeToFirstReview !== null) {
        totalTimeToFirstReview += metrics.timeToFirstReview
        countWithFirstReview++
      }

      if (metrics.totalReviewTime !== null && !pr.is_open) {
        totalReviewTime += metrics.totalReviewTime
        countWithTotalReview++
      }
    })

    return {
      avgTimeToFirstReview: countWithFirstReview > 0 ? totalTimeToFirstReview / countWithFirstReview : 0,
      avgTotalReviewTime: countWithTotalReview > 0 ? totalReviewTime / countWithTotalReview : 0,
      avgTimeToFirstReviewDays: countWithFirstReview > 0 ? totalTimeToFirstReview / countWithFirstReview / 24 : 0,
      avgTotalReviewTimeDays: countWithTotalReview > 0 ? totalReviewTime / countWithTotalReview / 24 : 0,
    }
  } catch (error) {
    console.error('Error calculating average review time:', error)
    throw error
  }
}

/**
 * Get review efficiency metrics
 * @returns {Promise<Object>} Efficiency metrics
 */
async function getReviewEfficiencyMetrics() {
  try {
    const [
      totalPRs,
      prsWithReviews,
      approvedPRs,
      changesRequestedPRs,
      mergedPRs,
      avgMetrics,
      bottlenecks,
    ] = await Promise.all([
      GitHubPR.countDocuments(),
      GitHubPR.countDocuments({ review_started_at: { $ne: null } }),
      GitHubPR.countDocuments({ review_status: 'approved' }),
      GitHubPR.countDocuments({ review_status: 'changes_requested' }),
      GitHubPR.countDocuments({ review_status: 'merged' }),
      calculateAverageReviewTime(),
      getReviewBottlenecks(),
    ])

    const reviewRate = totalPRs > 0 ? (prsWithReviews / totalPRs) * 100 : 0
    const approvalRate = prsWithReviews > 0 ? (approvedPRs / prsWithReviews) * 100 : 0

    return {
      totalPRs,
      prsWithReviews,
      reviewRate: Math.round(reviewRate * 100) / 100,
      approvedPRs,
      changesRequestedPRs,
      mergedPRs,
      approvalRate: Math.round(approvalRate * 100) / 100,
      avgTimeToFirstReviewHours: Math.round(avgMetrics.avgTimeToFirstReview * 100) / 100,
      avgTimeToFirstReviewDays: Math.round(avgMetrics.avgTimeToFirstReviewDays * 100) / 100,
      avgTotalReviewTimeHours: Math.round(avgMetrics.avgTotalReviewTime * 100) / 100,
      avgTotalReviewTimeDays: Math.round(avgMetrics.avgTotalReviewTimeDays * 100) / 100,
      bottlenecks: {
        totalStuckPRs: bottlenecks.totalStuckPRs,
        repositoriesWithStuckPRs: Object.keys(bottlenecks.byRepository).length,
      },
    }
  } catch (error) {
    console.error('Error getting review efficiency metrics:', error)
    throw error
  }
}

module.exports = {
  calculateReviewMetrics,
  getReviewBottlenecks,
  calculateAverageReviewTime,
  getReviewEfficiencyMetrics,
}
