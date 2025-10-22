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
        },
      },
      {
        $sort: { pr_count: -1 },
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
            $mergeObjects: ['$user', { _id: '$_id', pr_count: '$pr_count' }],
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
      .populate({
        path: 'repository',
        populate: {
          path: 'owner',
        },
      })
      .sort({ createdAt: -1 })
      .lean()
    res.json({ prs })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

export async function refreshAllUserPRs(req, res) {
  try {
    const users = await models.User.find({}, 'username').lean()

    if (users.length === 0) {
      return res.json({ message: 'No users to refresh', usersRefreshed: 0 })
    }

    let successCount = 0
    let errorCount = 0

    for (const user of users) {
      try {
        await refreshUserPRs(user.username)
        successCount++
        await new Promise((resolve) => setTimeout(resolve, 2000))
      } catch (error) {
        console.error(`Error refreshing ${user.username}:`, error.message)
        errorCount++
      }
    }

    res.json({
      message: 'Refresh completed',
      usersRefreshed: successCount,
      errors: errorCount,
      total: users.length,
    })
  } catch (error) {
    console.error('Error in manual refresh:', error)
    res.status(500).json({ error: error.message })
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
