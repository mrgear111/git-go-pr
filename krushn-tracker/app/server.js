const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
require('dotenv').config()

const {
  User,
  College,
  GitHubOwner,
  GitHubRepository,
  GitHubPR,
} = require(__dirname + '/../models')

const {
  calculateReviewMetrics,
  getReviewBottlenecks,
  getReviewEfficiencyMetrics,
} = require(__dirname + '/../reviewUtils.cjs')

const { fetchPRReviewData } = require(__dirname + '/../githubUtils.cjs')

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB')
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err)
  })

app.get('/api', (req, res) => {
  res.send('Krushn Tracker API is running')
})

app.get('/api/GitHubPRs', async (req, res) => {
  try {
    const prs = await GitHubPR.find()
      .populate({
        path: 'author',
        populate: { path: 'college' },
      })
      .populate({
        path: 'repository',
        populate: { path: 'owner' },
      })

    // exclude PRs from red-flagged repositories
    const filteredPRs = prs.filter((pr) => !pr.repository.is_redFlagged)

    res.json(filteredPRs)
  } catch (error) {
    console.error('Error fetching PRs:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.post('/api/redFlagRepository', async (req, res) => {
  const { repositoryId } = req.body
  if (!repositoryId) {
    return res.status(400).json({ error: 'repositoryId is required' })
  }

  try {
    const repository = await GitHubRepository.findById(repositoryId)
    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' })
    }

    repository.is_redFlagged = true
    await repository.save()

    res.json({ message: 'Repository red-flagged successfully', repository })
  } catch (error) {
    console.error('Error red-flagging repository:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.get('/api/statistics', async (req, res) => {
  try {
    const totalPRs = await GitHubPR.countDocuments()
    const mergedPRs = await GitHubPR.countDocuments({ is_merged: true })
    const openPRs = await GitHubPR.countDocuments({ is_open: true })
    const closedPRs = totalPRs - openPRs

    const totalRepositories = await GitHubRepository.countDocuments()
    const redFlaggedRepositories = await GitHubRepository.countDocuments({
      is_redFlagged: true,
    })

    const totalUsers = await User.countDocuments()
    const totalColleges = await College.countDocuments()
    const totalOwners = await GitHubOwner.countDocuments()

    // Review status statistics
    const reviewStatusCounts = await GitHubPR.aggregate([
      {
        $group: {
          _id: '$review_status',
          count: { $sum: 1 },
        },
      },
    ])

    const reviewStats = {}
    reviewStatusCounts.forEach((item) => {
      reviewStats[item._id] = item.count
    })

    res.json({
      totalPRs,
      mergedPRs,
      openPRs,
      closedPRs,
      totalRepositories,
      redFlaggedRepositories,
      totalUsers,
      totalColleges,
      totalOwners,
      reviewStats,
    })
  } catch (error) {
    console.error('Error fetching statistics:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get review status for a specific PR
app.get('/api/prs/:id/review-status', async (req, res) => {
  try {
    const { id } = req.params

    const pr = await GitHubPR.findById(id)
      .populate({
        path: 'author',
        select: 'username full_name',
      })
      .populate({
        path: 'repository',
        populate: { path: 'owner', select: 'username name' },
      })

    if (!pr) {
      return res.status(404).json({ error: 'PR not found' })
    }

    const metrics = calculateReviewMetrics(pr)

    res.json({
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
      is_open: pr.is_open,
      is_merged: pr.is_merged,
      metrics,
    })
  } catch (error) {
    console.error('Error fetching PR review status:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update review status for a specific PR (manual override or refresh)
app.put('/api/prs/:id/review-status', async (req, res) => {
  try {
    const { id } = req.params
    const { review_status } = req.body

    if (!review_status) {
      return res.status(400).json({ error: 'review_status is required' })
    }

    const validStatuses = ['pending', 'in_review', 'approved', 'changes_requested', 'merged']
    if (!validStatuses.includes(review_status)) {
      return res.status(400).json({
        error: 'Invalid review_status',
        validStatuses,
      })
    }

    const pr = await GitHubPR.findById(id)
    if (!pr) {
      return res.status(404).json({ error: 'PR not found' })
    }

    pr.review_status = review_status
    await pr.save()

    res.json({
      message: 'Review status updated successfully',
      pr: {
        id: pr._id,
        title: pr.title,
        review_status: pr.review_status,
      },
    })
  } catch (error) {
    console.error('Error updating PR review status:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Refresh review status from GitHub API
app.post('/api/prs/:id/refresh-review-status', async (req, res) => {
  try {
    const { id } = req.params

    const pr = await GitHubPR.findById(id).populate({
      path: 'repository',
      populate: { path: 'owner' },
    })

    if (!pr) {
      return res.status(404).json({ error: 'PR not found' })
    }

    if (!pr.repository || !pr.repository.owner) {
      return res.status(400).json({ error: 'PR missing repository or owner data' })
    }

    const owner = pr.repository.owner.username
    const repo = pr.repository.name
    const prNumber = pr.pr_number

    if (!prNumber) {
      return res.status(400).json({ error: 'PR number not found' })
    }

    // Fetch fresh review data from GitHub
    const reviewData = await fetchPRReviewData(owner, repo, prNumber, {
      merged_at: pr.is_merged,
      prMerged: pr.is_merged,
    })

    // Update PR with fresh data
    pr.review_status = reviewData.review_status
    pr.review_started_at = reviewData.review_started_at
    pr.reviewers = reviewData.reviewers
    pr.review_comments_count = reviewData.review_comments_count

    await pr.save()

    res.json({
      message: 'Review status refreshed successfully',
      pr: {
        id: pr._id,
        title: pr.title,
        review_status: pr.review_status,
        review_started_at: pr.review_started_at,
        reviewers: pr.reviewers,
        review_comments_count: pr.review_comments_count,
      },
    })
  } catch (error) {
    console.error('Error refreshing PR review status:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get all PRs currently in review
app.get('/api/prs/in-review', async (req, res) => {
  try {
    const prs = await GitHubPR.find({
      review_status: { $in: ['in_review', 'changes_requested', 'approved'] },
      is_open: true,
    })
      .populate({
        path: 'author',
        populate: { path: 'college' },
      })
      .populate({
        path: 'repository',
        populate: { path: 'owner' },
      })
      .sort({ review_started_at: 1 })

    // Filter out red-flagged repositories
    const filteredPRs = prs.filter((pr) => !pr.repository.is_redFlagged)

    // Add metrics to each PR
    const prsWithMetrics = filteredPRs.map((pr) => {
      const metrics = calculateReviewMetrics(pr)
      return {
        ...pr.toObject(),
        metrics,
      }
    })

    res.json(prsWithMetrics)
  } catch (error) {
    console.error('Error fetching PRs in review:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get review bottleneck analysis
app.get('/api/review-analytics/bottlenecks', async (req, res) => {
  try {
    const bottlenecks = await getReviewBottlenecks()
    res.json(bottlenecks)
  } catch (error) {
    console.error('Error fetching review bottlenecks:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get review efficiency metrics
app.get('/api/review-analytics/efficiency', async (req, res) => {
  try {
    const metrics = await getReviewEfficiencyMetrics()
    res.json(metrics)
  } catch (error) {
    console.error('Error fetching review efficiency metrics:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get PRs by review status
app.get('/api/prs/by-status/:status', async (req, res) => {
  try {
    const { status } = req.params
    const validStatuses = ['pending', 'in_review', 'approved', 'changes_requested', 'merged']

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid review status',
        validStatuses,
      })
    }

    const prs = await GitHubPR.find({ review_status: status })
      .populate({
        path: 'author',
        populate: { path: 'college' },
      })
      .populate({
        path: 'repository',
        populate: { path: 'owner' },
      })
      .sort({ createdAt: -1 })

    // Filter out red-flagged repositories
    const filteredPRs = prs.filter((pr) => !pr.repository.is_redFlagged)

    res.json(filteredPRs)
  } catch (error) {
    console.error('Error fetching PRs by status:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.use('/', express.static(__dirname + '/public'))

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
