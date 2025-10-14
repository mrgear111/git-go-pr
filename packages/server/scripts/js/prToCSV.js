import dotenv, { populate } from 'dotenv'
dotenv.config()

import models from '../../models/index.mjs'
const { User, College, GitHubPR } = models

import mongoose from 'mongoose'

import fs from 'fs'

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
  // count all PRs for user in DB

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
    .sort({ created_at: -1 })

  console.log('Total PRs:', prs.length)

  // create CSV
  const csvLines = []
  fs.writeFileSync(
    'prs.csv',
    'PR ID,Link,Author Username,Author Name,Author College,Author Year,Repository Owner,Repository,Created At,isOpen,isMerged',
    'utf-8'
  )

  for (const pr of prs) {
    const line = [
      pr._id,
      pr.link ? pr.link : '',
      pr.author ? pr.author.username : 'Unknown',
      pr.author && pr.author.full_name ? pr.author.full_name : 'Unknown',
      pr.author && pr.author.college ? pr.author.college.name : 'Unknown',
      pr.author && pr.author.year ? pr.author.year : 'Unknown',
      pr.repository && pr.repository.owner
        ? pr.repository.owner.username
        : 'Unknown',
      pr.repository ? pr.repository.name : 'Unknown',
      pr.createdAt ? pr.createdAt.toISOString() : '',
      pr.is_open ? 'Yes' : 'No',
      pr.is_merged ? 'Yes' : 'No',
    ].join(',')

    fs.appendFileSync('prs.csv', '\n' + line, 'utf-8')
  }
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
