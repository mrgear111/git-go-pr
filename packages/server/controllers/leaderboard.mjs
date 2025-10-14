import models from '../models/index.mjs'

const { User } = models

export async function getLeaderboard(req, res) {
  try {
    // Use MongoDB aggregation to get leaderboard data efficiently
    const leaderboard = await User.aggregate([
      {
        $lookup: {
          from: 'githubprs',
          localField: '_id',
          foreignField: 'author',
          as: 'prs',
        },
      },
      {
        $addFields: {
          total_prs: { $size: '$prs' },
          merged_prs: {
            $size: {
              $filter: {
                input: '$prs',
                cond: { $eq: ['$$this.is_merged', true] },
              },
            },
          },
        },
      },
      {
        $project: {
          username: 1,
          display_name: '$full_name',
          avatar_url: 1,
          total_prs: 1,
          merged_prs: 1,
        },
      },
      {
        $sort: { merged_prs: -1 },
      },
    ])

    res.json(leaderboard)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
