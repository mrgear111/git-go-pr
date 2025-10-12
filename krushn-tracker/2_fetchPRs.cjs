require('dotenv').config()

const mongoose = require('mongoose')

if (require.main === module) {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
      console.log('Connected to MongoDB')
    })
    .catch((err) => {
      console.error('Error connecting to MongoDB:', err)
    })
}

const { User, GitHubOwner, GitHubRepository, GitHubPR } = require('./models')

const {
  fetchPRsForUser,
  fetchOwnerDetails,
  fetchRepositoryDetails,
  fetchPRReviewData,
} = require('./githubUtils.cjs')

const fetchPullRequests = async (users) => {
  let totalPRsFetched = 0

  try {
    // Clear existing data
    // await GitHubOwner.deleteMany({})
    // await GitHubRepository.deleteMany({})
    // await GitHubPR.deleteMany({})
    // console.log('Cleared existing data')

    // Fetch users

    for (const user of users) {
      const username = user.username
      console.log(`Processing user: ${username}`)

      // Fetch PRs for the user
      const prRows = await fetchPRsForUser(username)

      totalPRsFetched += prRows.length

      console.log(`Fetched ${prRows.length} PRs for user ${username}`)

      for (const prData of prRows) {
        // Upsert owner
        let owner = await GitHubOwner.findOne({ username: prData.owner })
        if (!owner) {
          const ownerDetails = await fetchOwnerDetails(prData.owner)
          owner = new GitHubOwner({
            github_id: ownerDetails.id,
            name: ownerDetails.name,
            username: ownerDetails.login,
            type: ownerDetails.type,
          })
          await owner.save()
          console.log(`Created new owner: ${prData.owner}`)
        }

        // Upsert repository
        let repository = await GitHubRepository.findOne({
          name: prData.repo,
          owner: owner._id,
        })
        if (!repository) {
          const repoDetails = await fetchRepositoryDetails(
            prData.owner,
            prData.repo
          )
          repository = new GitHubRepository({
            github_id: repoDetails.id,
            name: repoDetails.name,
            owner: owner._id,
            is_gosc: false,
            is_redFlagged: false,
          })
          await repository.save()
          console.log(
            `Created new repository: ${prData.repo} under owner ${prData.owner}`
          )
        }

        // Extract PR number from link
        const prNumberMatch = prData.prLink.match(/\/pull\/(\d+)/)
        const prNumber = prNumberMatch ? parseInt(prNumberMatch[1]) : null

        // Fetch review data for the PR
        let reviewData = {
          review_status: 'pending',
          review_started_at: null,
          reviewers: [],
          review_comments_count: 0,
        }

        if (prNumber) {
          try {
            reviewData = await fetchPRReviewData(
              prData.owner,
              prData.repo,
              prNumber,
              prData
            )
            console.log(
              `Fetched review data for PR #${prNumber}: ${reviewData.review_status}`
            )
          } catch (error) {
            console.error(
              `Failed to fetch review data for PR #${prNumber}:`,
              error.message
            )
          }
        }

        // Upsert PR
        let pr = await GitHubPR.findOne({ github_id: prData.github_id })
        if (!pr) {
          pr = new GitHubPR({
            github_id: prData.github_id,
            title: prData.title,
            body: prData.body,
            author: user._id,
            repository: repository._id,
            is_open: prData.prStatus === 'open',
            is_merged: prData.prMerged,
            createdAt: prData.prDate,
            link: prData.prLink,
            pr_number: prNumber,
            review_status: reviewData.review_status,
            review_started_at: reviewData.review_started_at,
            reviewers: reviewData.reviewers,
            review_comments_count: reviewData.review_comments_count,
          })
          await pr.save()
          console.log(
            `Created new PR: ${prData.title} for repository ${prData.repo}`
          )
        } else {
          // Update existing PR status if changed
          let updated = false
          if (pr.is_open !== (prData.prStatus === 'open')) {
            pr.is_open = prData.prStatus === 'open'
            updated = true
          }
          if (pr.is_merged !== prData.prMerged) {
            pr.is_merged = prData.prMerged
            updated = true
          }
          if (!pr.link) {
            pr.link = prData.prLink
            updated = true
          }
          if (!pr.pr_number && prNumber) {
            pr.pr_number = prNumber
            updated = true
          }
          // Update review data
          if (reviewData.review_status !== pr.review_status) {
            pr.review_status = reviewData.review_status
            updated = true
          }
          if (reviewData.review_comments_count !== pr.review_comments_count) {
            pr.review_comments_count = reviewData.review_comments_count
            updated = true
          }
          if (reviewData.review_started_at && !pr.review_started_at) {
            pr.review_started_at = reviewData.review_started_at
            updated = true
          }
          if (JSON.stringify(reviewData.reviewers) !== JSON.stringify(pr.reviewers)) {
            pr.reviewers = reviewData.reviewers
            updated = true
          }
          if (updated) {
            await pr.save()
            console.log(`Updated PR: ${prData.title} status`)
          }
        }
      }
    }

    return totalPRsFetched
  } catch (err) {
    console.error('Error setting up database:', err)
  } finally {
    if (require.main === module) {
      mongoose.connection.close()
    }
  }
}

const main = async () => {
  try {
    let users = await User.find({})
    console.log(`Fetched ${users.length} users from database`)

    const totalPRsFetched = await fetchPullRequests(users)
    console.log(`Total PRs fetched: ${totalPRsFetched}`)
  } catch (err) {
    console.error('Error in main execution:', err)
  }
}

if (require.main === module) {
  console.log('Starting PR fetch process...')
  main()
}

module.exports = {
  fetchPullRequests,
}
