require('dotenv').config()

const mongoose = require('mongoose')

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB')
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err)
    process.exit(1)
  })

const { GitHubPR, GitHubRepository, GitHubOwner } = require('./models')
const { fetchPRReviewData } = require('./githubUtils.cjs')

/**
 * Update review status for all existing PRs
 * This script fetches the latest review data from GitHub for all PRs
 */
async function updateReviewStatus() {
  try {
    console.log('Starting review status update...')

    // Find all open PRs (including those in any state)
    const prs = await GitHubPR.find()
      .populate({
        path: 'repository',
        populate: { path: 'owner' },
      })
      .sort({ createdAt: -1 })

    console.log(`Found ${prs.length} PRs to update`)

    let updatedCount = 0
    let errorCount = 0

    for (let i = 0; i < prs.length; i++) {
      const pr = prs[i]

      try {
        // Skip if no repository or owner data
        if (!pr.repository || !pr.repository.owner) {
          console.warn(`Skipping PR ${pr.github_id}: Missing repository or owner data`)
          continue
        }

        const owner = pr.repository.owner.username
        const repo = pr.repository.name

        // Extract PR number from link or use stored pr_number
        let prNumber = pr.pr_number

        if (!prNumber && pr.link) {
          const prNumberMatch = pr.link.match(/\/pull\/(\d+)/)
          if (prNumberMatch) {
            prNumber = parseInt(prNumberMatch[1])
            pr.pr_number = prNumber
          }
        }

        if (!prNumber) {
          console.warn(`Skipping PR ${pr.github_id}: No PR number found`)
          continue
        }

        console.log(
          `[${i + 1}/${prs.length}] Updating PR #${prNumber} in ${owner}/${repo}...`
        )

        // Fetch review data
        const reviewData = await fetchPRReviewData(owner, repo, prNumber, {
          merged_at: pr.is_merged,
          prMerged: pr.is_merged,
        })

        // Update PR with review data
        pr.review_status = reviewData.review_status
        pr.review_started_at = reviewData.review_started_at
        pr.reviewers = reviewData.reviewers
        pr.review_comments_count = reviewData.review_comments_count

        await pr.save()

        console.log(
          `  ✓ Updated: ${reviewData.review_status} | ${reviewData.reviewers.length} reviewers | ${reviewData.review_comments_count} comments`
        )

        updatedCount++

        // Add a small delay to avoid rate limiting
        if (updatedCount % 10 === 0) {
          console.log(`Progress: ${updatedCount}/${prs.length} PRs updated`)
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      } catch (error) {
        console.error(`Error updating PR ${pr.github_id}:`, error.message)
        errorCount++
      }
    }

    console.log('\n=== Update Complete ===')
    console.log(`Total PRs processed: ${prs.length}`)
    console.log(`Successfully updated: ${updatedCount}`)
    console.log(`Errors: ${errorCount}`)

    // Print summary by review status
    const statusCounts = await GitHubPR.aggregate([
      {
        $group: {
          _id: '$review_status',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ])

    console.log('\n=== Review Status Summary ===')
    statusCounts.forEach((status) => {
      console.log(`${status._id}: ${status.count}`)
    })
  } catch (error) {
    console.error('Error during review status update:', error)
    throw error
  } finally {
    await mongoose.connection.close()
    console.log('\nDatabase connection closed')
  }
}

// Run update
if (require.main === module) {
  updateReviewStatus()
    .then(() => {
      console.log('\nReview status update script finished')
      process.exit(0)
    })
    .catch((err) => {
      console.error('\nReview status update script failed:', err)
      process.exit(1)
    })
}

module.exports = { updateReviewStatus }
