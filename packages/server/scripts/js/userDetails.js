import dotenv from 'dotenv'
dotenv.config()

import models from '../../models/index.mjs'
const { User, College, GitHubPR } = models

import mongoose from 'mongoose'

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB')
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err)
    process.exit(1)
  })

async function main() {
  const college = await College.findOne({ name: 'NST RU' })

  console.log('College:', college)

  // fetch all users
  const users = await User.find({
    college: college._id,
  })

  console.log(users.length)

  // count all PRs for user in DB

  const prs = await GitHubPR.aggregate([
    {
      $match: {
        author: {
          $in: users.map((u) => u._id),
        },
      },
    },
    {
      $group: {
        _id: '$author',
        prCount: {
          $sum: 1,
        },
      },
    },

    {
      $sort: {
        prCount: -1,
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'userDetails',
      },
    },

    {
      $unwind: '$userDetails',
    },
  ])

  prs.forEach((element) => {
    console.log(`${element.userDetails.full_name} (${element.userDetails.username}) - ${element.prCount}`)
  })
  console.log(prs.length)
}

main()
  .then(() => {
    console.log('Done')
  })
  .catch((err) => {
    console.error('Error in main execution:', err)
  })
  .finally(() => {
    mongoose.disconnect()
  })
