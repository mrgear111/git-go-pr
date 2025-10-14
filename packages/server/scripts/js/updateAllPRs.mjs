import {
  fetchMergeStatus,
  fetchOwnerDetails,
  fetchRepositoryDetails,
  fetchUserDetails,
  fetchUserDetailsById,
  fetchPRsForUser,
} from '../../services/githubUtils.mjs'

import models from '../../models/index.mjs'
const { User, College, GitHubPR, GitHubRepository, GitHubOwner } = models

import mongoose from 'mongoose'

import fs from 'fs'

let notdoneList = fs
  .readFileSync('./fetch-error.log', 'utf-8')
  .split('\n')
  .filter(Boolean)

notdoneList = [...new Set(notdoneList)]

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB')
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err)
    process.exit(1)
  })

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

let updatedCount = 0
let createdCount = 0

async function main() {
  // fetch all users
  const users = await User.find({
    username: { $in: notdoneList },
  }).sort({ createdAt: -1 })
  console.log(`Fetched ${users.length} users from DB.`)

  // for each user, fetch all their PRs from GitHub and update DB
  for (let i = 0; i < users.length; i++) {
    const user = users[i]
    const pullRequests = await fetchPRsForUser(user.username)

    for (const prData of pullRequests) {
      // Check if PR already exists in DB
      let pr = await GitHubPR.findOne({ github_id: prData.github_id })

      let owner = await GitHubOwner.findOne({ username: prData.owner })

      if (!owner) {
        console.log(`Owner not found for ${prData.owner}`)

        const ownerDetails = await fetchOwnerDetails(prData.owner)
        console.log(`Fetched owner details for ${prData.owner}`)
        if (ownerDetails) {
          owner = new GitHubOwner({
            github_id: ownerDetails.id,
            username: ownerDetails.login,
            name: ownerDetails.name,
            link: ownerDetails.html_url,
            type: ownerDetails.type,
          })
          await owner.save()
        }
      } else if (!owner.link) {
        owner.link = `https://github.com/${owner.username}`
        await owner.save()
      }

      console.log(`Using owner ${owner.username}`)

      let repo = await GitHubRepository.findOne({
        name: prData.repo,
        owner: owner._id,
      })

      if (!repo) {
        console.log(`Repository not found for ${prData.repo}`)

        const repoDetails = await fetchRepositoryDetails(
          owner.username,
          prData.repo
        )

        if (!repoDetails) {
          console.warn(
            `Repository details not found for ${owner.username}/${prData.repo}, skipping PR ${prData.prLink}`
          )
          continue // Skip this PR if repository details are not found
        }

        console.log(`Fetched repository details for ${prData.repo}`)

        if (repoDetails) {
          repo = new GitHubRepository({
            github_id: repoDetails.id,
            name: repoDetails.name,
            owner: owner._id,
            link: repoDetails.html_url,
          })
          try {
            await repo.save()
          } catch (err) {
            if (err.code === 11000) {
              console.warn(
                `Duplicate repository entry for ${repoDetails.full_name}, fetching existing record.`
              )
              repo = await GitHubRepository.findOne({
                github_id: repoDetails.id,
              })
              if (!repo) {
                console.error(
                  `Failed to fetch existing repository after duplicate key error for ${repoDetails.full_name}. Skipping PR ${prData.prLink}.`
                )
                continue // Skip this PR if we can't resolve the repository
              }
              repo.name = repoDetails.name
              repo.owner = owner._id
              repo.link = repoDetails.html_url
              // continue saving other fields as needed
              await repo.save()
              console.log(
                `Updated existing repository ${repoDetails.full_name}`
              )
            } else {
              console.error('Error saving repository:', err)
            }
          }
        }
      } else if (!repo.link) {
        repo.link = `https://github.com/${repo.owner.username}/${repo.name}`
        await repo.save()
      }

      console.log(`Using repository ${owner.username}/${repo.name}`)

      if (pr) {
        if (!pr.author) pr.author = user._id
        if (!pr.repository) pr.repository = repo._id
        if (!pr.link) pr.link = prData.prLink
        if (!pr.createdAt) pr.createdAt = prData.prDate

        pr.title = prData.title
        pr.body = prData.body
        pr.is_open = prData.prStatus == 'open'
        pr.is_merged = prData.prMerged

        await pr.save()

        console.log(`Updated PR ${prData.prLink}`)
        updatedCount++
      } else {
        pr = new GitHubPR({
          github_id: prData.github_id,
          title: prData.title,
          body: prData.body,
          author: user._id,
          repository: repo._id,
          link: prData.prLink,
          is_open: prData.prStatus == 'open',
          is_merged: prData.prMerged,
          createdAt: prData.prDate,
        })
        await pr.save()
        console.log(`Created PR ${prData.prLink}`)
        createdCount++
      }
    }
    console.log(
      `Processed PRs for user ${i + 1}/${users.length}: ${
        user.username
      }\n\n---\n`
    )
    await delay(500) // to avoid rate limits
  }

  console.log(
    `Summary: ${updatedCount} PRs updated, ${createdCount} PRs created`
  )
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
