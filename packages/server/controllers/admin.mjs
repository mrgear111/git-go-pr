import { populate } from 'dotenv'
import models from '../models/index.mjs'
import { refreshUserPRs } from '../services/prService.js'

const { User, GitHubPR, GitHubRepository, GitHubOwner, College } = models

export async function getAllUsers(req, res) {
  try {
    const usersWithPRs = await GitHubPR.aggregate([
      {
        $group: {
          _id: '$author',
          pr_count: { $sum: 1 },
          merged_count: {
            $sum: { $cond: [{ $eq: ['$is_merged', true] }, 1, 0] }
          },
        },
      },
      {
        $sort: { merged_count: -1, pr_count: -1 },
      },
      {
        $lookup: {
          from: 'githubrepositories',
          localField: 'repository',
          foreignField: '_id',
          as: 'repository',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
          pipeline: [
            {
              $lookup: {
                from: 'colleges',
                localField: 'college',
                foreignField: '_id',
                as: 'college',
              },
            },
            {
              $project: {
                username: 1,
                full_name: 1,
                avatar_url: 1,
                role: 1,
                college: { $arrayElemAt: ['$college', 0] },
                last_fetch_time: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: '$user',
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ['$user', { _id: '$_id', pr_count: '$pr_count', merged_count: '$merged_count' }],
          },
        },
      },
    ])

    res.json({ users: usersWithPRs })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

export async function getAllUserPRs(req, res) {
  try {
    const { userId } = req.params
    const prs = await GitHubPR.find({ author: userId })
      .sort({ createdAt: -1 })
      .lean()
    
    // Format PRs for frontend - extract repo info from link
    const formattedPRs = prs.map(pr => {
      // Parse GitHub PR URL: https://github.com/owner/repo/pull/123
      const urlMatch = pr.link.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/)
      const owner = urlMatch ? urlMatch[1] : 'unknown'
      const repoName = urlMatch ? urlMatch[2] : 'unknown'
      const prNumber = urlMatch ? parseInt(urlMatch[3]) : 0
      
      return {
        _id: pr._id,
        pr_number: prNumber,
        title: pr.title,
        url: pr.link,
        state: pr.is_open ? 'open' : 'closed',
        createdAt: pr.createdAt,
        repository: {
          name: repoName,
          owner: {
            username: owner
          }
        }
      }
    })
    
    res.json({ prs: formattedPRs })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Global state for refresh job
let refreshJob = {
  isRunning: false,
  totalUsers: 0,
  processed: 0,
  successful: 0,
  errors: 0,
  currentUser: null,
  startTime: null,
  lastCompletedTime: null,
  recentLogs: []
}

const COOLDOWN_HOURS = 10
const COOLDOWN_MS = COOLDOWN_HOURS * 60 * 60 * 1000

export async function getRefreshStatus(req, res) {
  res.json(refreshJob)
}

export async function refreshAllUserPRs(req, res) {
  // Check if already running
  if (refreshJob.isRunning) {
    return res.json({ 
      success: false, 
      message: 'Refresh already in progress',
      status: refreshJob 
    })
  }

  // Check cooldown period
  if (refreshJob.lastCompletedTime) {
    const timeSinceLastRefresh = Date.now() - new Date(refreshJob.lastCompletedTime).getTime()
    const remainingCooldown = COOLDOWN_MS - timeSinceLastRefresh
    
    if (remainingCooldown > 0) {
      const hoursRemaining = Math.ceil(remainingCooldown / (60 * 60 * 1000))
      const minutesRemaining = Math.ceil((remainingCooldown % (60 * 60 * 1000)) / (60 * 1000))
      
      return res.json({ 
        success: false, 
        message: `Refresh on cooldown. Please wait ${hoursRemaining}h ${minutesRemaining}m before refreshing again.`,
        cooldownRemaining: remainingCooldown,
        nextRefreshTime: new Date(new Date(refreshJob.lastCompletedTime).getTime() + COOLDOWN_MS)
      })
    }
  }

  // Start the job immediately and return
  res.json({ 
    success: true, 
    message: 'Refresh started in background' 
  })

  // Run in background
  runRefreshJob().catch(err => {
    console.error('Background refresh job error:', err)
    refreshJob.isRunning = false
  })
}

async function runRefreshJob() {
  refreshJob = {
    ...refreshJob, // Preserve lastCompletedTime
    isRunning: true,
    totalUsers: 0,
    processed: 0,
    successful: 0,
    errors: 0,
    currentUser: null,
    startTime: new Date(),
    recentLogs: []
  }

  try {
    const users = await models.User.find({}, 'username').lean()
    refreshJob.totalUsers = users.length

    console.log(`Starting refresh for ${users.length} users...`)

    for (let i = 0; i < users.length; i++) {
      const user = users[i]
      refreshJob.currentUser = user.username
      refreshJob.processed = i + 1

      try {
        await refreshUserPRs(user.username)
        refreshJob.successful++
        refreshJob.recentLogs.unshift({
          username: user.username,
          status: 'success',
          timestamp: new Date()
        })
      } catch (error) {
        console.error(`Error refreshing ${user.username}:`, error.message)
        refreshJob.errors++
        refreshJob.recentLogs.unshift({
          username: user.username,
          status: 'error',
          error: error.message,
          timestamp: new Date()
        })
      }

      // Keep only last 20 logs
      if (refreshJob.recentLogs.length > 20) {
        refreshJob.recentLogs = refreshJob.recentLogs.slice(0, 20)
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300))
    }

    console.log(`Refresh complete: ${refreshJob.successful} successful, ${refreshJob.errors} errors`)
    
    // Set completion time for cooldown
    refreshJob.lastCompletedTime = new Date()
  } catch (error) {
    console.error('Fatal error in refresh job:', error)
  } finally {
    refreshJob.isRunning = false
    refreshJob.currentUser = null
  }
}

export async function getAdminStats(req, res) {
  try {
    const [totalUsers, totalPRs, openPRs, mergedPRs] = await Promise.all([
      User.countDocuments(),
      GitHubPR.countDocuments(),
      GitHubPR.countDocuments({ is_open: true }),
      GitHubPR.countDocuments({ is_merged: true }),
    ])

    res.json({
      totalUsers,
      totalPRs,
      openPRs,
      mergedPRs,
      averagePRsPerUser:
        totalUsers > 0 ? (totalPRs / totalUsers).toFixed(2) : 0,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

export async function getAllPRs(req, res) {
  try {
    const prs = await GitHubPR.find()
      .populate([
        {
          path: 'author',
          populate: {
            path: 'college',
          },
        },
        {
          path: 'repository',
          populate: {
            path: 'owner',
          },
        },
      ])
      .sort({ createdAt: -1 })
      .lean()
    res.json({ prs })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

export async function getAllColleges(req, res) {
  try {
    const colleges = await models.College.find().lean()
    res.json({ colleges })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

export async function getAllOwners(req, res) {
  try {
    const owners = await models.GitHubOwner.find().lean()
    res.json({ owners })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

export async function getAllRepositories(req, res) {
  try {
    const repositories = await models.GitHubRepository.find()
      .populate('owner')
      .lean()
    res.json({ repositories })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

export async function getStatistics(req, res) {
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
    })
  } catch (error) {
    console.error('Error fetching statistics:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
